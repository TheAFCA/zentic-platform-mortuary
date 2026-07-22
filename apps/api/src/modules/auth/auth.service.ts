import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import {
  AuthUser,
  JwtPayload,
  Permission,
  TenantStatus,
  UserRole,
} from '@zentic/shared-types';
import { AuthRepository } from './auth.repository';
import {
  hashPassword,
  verifyPassword,
} from '../../common/security/password.util';
import { assertStrongPassword } from '../../common/security/password-policy';
import {
  generateSecureToken,
  hashToken,
} from '../../common/security/token.util';
import { EmailService } from '../email/email.service';
import { SecurityEventsService } from '../security-events/security-events.service';

type AuthUserRecord = NonNullable<
  Awaited<ReturnType<AuthRepository['findUserForLogin']>>
>;

type AuthSessionRecord = NonNullable<
  Awaited<ReturnType<AuthRepository['findSessionById']>>
>;

type PasswordResetRecord = NonNullable<
  Awaited<ReturnType<AuthRepository['findPasswordResetByTokenHash']>>
>;

type AuthRequest = Omit<Request, 'cookies'> & {
  resolvedTenantId?: string;
  tenantId?: string;
  cookies?: Record<string, string | undefined>;
};

type RefreshTokenPayload = JwtPayload & { sid: string; type: 'refresh' };

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const PASSWORD_RESET_MINUTES = 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly securityEvents: SecurityEventsService,
  ) {}

  async login(
    email: string,
    password: string,
    req: AuthRequest,
    res: Response,
  ) {
    const tenantId = this.resolveTenantId(req);
    const user = await this.authRepository.findUserForLogin(email, tenantId);

    if (!user) {
      await this.securityEvents.recordFailedLogin({
        actorId: email,
        role: UserRole.VIEWER,
        tenantId,
        ipAddress: req.ip ?? null,
        metadata: {
          email,
          userFound: false,
          tenantId,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertUserCanAuthenticate(user, tenantId);
    this.assertTenantIsActive(user);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is temporarily locked');
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user, req);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.authRepository.updateLoginState(user.id, {
      loginAttempts: 0,
      lockedUntil: null,
    });

    return this.issueSession(user, req, res);
  }

  async logout(req: AuthRequest, res: Response) {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

      if (refreshToken) {
        const payload = await this.verifyRefreshToken(refreshToken);
        await this.authRepository.revokeSession(payload.sid);
      }
    } finally {
      this.clearAuthCookies(res);
    }
  }

  async refresh(req: AuthRequest, res: Response) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.getValidSession(payload.sid, refreshToken, req);

    const user = session.user;
    this.assertUserCanAuthenticate(user, this.resolveTenantId(req));
    this.assertTenantIsActive(user);

    const authUser = this.toAuthUser(user);
    const accessToken = this.signAccessToken(authUser);
    const rotatedRefreshToken = await this.signRefreshToken(
      authUser,
      session.id,
    );
    const refreshTokenHash = await hashPassword(rotatedRefreshToken);

    await this.authRepository.updateSessionRefreshToken(
      session.id,
      refreshTokenHash,
      this.getRefreshExpiresAt(),
    );

    this.setAuthCookies(res, accessToken, rotatedRefreshToken);
    return authUser;
  }

  async forgotPassword(email: string, req: AuthRequest) {
    const tenantId = this.resolveTenantId(req);
    const user = await this.authRepository.findUserForLogin(email, tenantId);

    if (!user) {
      return;
    }

    const token = generateSecureToken();
    const tokenHash = hashToken(token);

    await this.authRepository.deleteUnusedPasswordResets(user.id);
    await this.authRepository.createPasswordReset({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000),
    });

    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      resetUrl: this.buildFrontendUrl(req, `/auth/reset-password/${token}`),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    assertStrongPassword(newPassword);

    const passwordReset = await this.getValidPasswordReset(token);

    const passwordHash = await hashPassword(newPassword);
    await this.authRepository.updatePasswordHash(
      passwordReset.user.id,
      passwordHash,
    );
    await this.authRepository.markPasswordResetUsed(passwordReset.id);
    await this.authRepository.revokeUserSessions(passwordReset.user.id);
  }

  async me(user: JwtPayload) {
    const currentUser = await this.authRepository.findUserById(user.sub);
    if (!currentUser) {
      throw new UnauthorizedException('User not found');
    }

    return this.toAuthUser(currentUser);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    assertStrongPassword(newPassword);

    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordMatches = await verifyPassword(
      currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid current password');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.authRepository.updatePasswordHash(user.id, passwordHash);
    await this.authRepository.revokeUserSessions(user.id);
  }

  private async issueSession(
    user: AuthUserRecord,
    req: AuthRequest,
    res: Response,
  ) {
    const authUser = this.toAuthUser(user);
    const accessToken = this.signAccessToken(authUser);
    const sessionId = randomUUID();
    const refreshToken = await this.signRefreshToken(authUser, sessionId);
    const refreshTokenHash = await hashPassword(refreshToken);

    await this.authRepository.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      device: req.get('user-agent') ?? null,
      ipAddress: req.ip ?? null,
      expiresAt: this.getRefreshExpiresAt(),
    });

    this.setAuthCookies(res, accessToken, refreshToken);
    return authUser;
  }

  private toAuthUser(user: AuthUserRecord): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      permissions: this.toPermissions(user.permissions),
    };
  }

  private toPermissions(records: { permission: string }[]): Permission[] {
    return records.map((record) => record.permission as Permission);
  }

  private async getValidPasswordReset(
    token: string,
  ): Promise<PasswordResetRecord> {
    const tokenHash = hashToken(token);
    const passwordReset =
      await this.authRepository.findPasswordResetByTokenHash(tokenHash);

    if (
      !passwordReset ||
      passwordReset.usedAt ||
      passwordReset.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException(
        'This reset link is invalid or has expired',
      );
    }

    return passwordReset;
  }

  private buildFrontendUrl(req: AuthRequest, path: string) {
    const frontendUrl = new URL(
      this.config.get<string>('FRONTEND_URL', 'http://localhost:4200'),
    );
    frontendUrl.hostname = req.hostname;
    frontendUrl.pathname = path;
    frontendUrl.search = '';
    frontendUrl.hash = '';
    return frontendUrl.toString();
  }

  private resolveTenantId(req: AuthRequest): string | null {
    return req.resolvedTenantId ?? req.tenantId ?? null;
  }

  private assertUserCanAuthenticate(
    user: Pick<AuthUserRecord, 'role' | 'tenantId'>,
    tenantId: string | null,
  ) {
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (!user.tenantId || user.tenantId !== tenantId) {
      throw new UnauthorizedException('Tenant context mismatch');
    }
  }

  private assertTenantIsActive(user: Pick<AuthUserRecord, 'role' | 'tenant'>) {
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (user.tenant?.status !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException('Account unavailable');
    }
  }

  private async handleFailedLogin(
    user: Pick<
      AuthUserRecord,
      'id' | 'email' | 'role' | 'tenantId' | 'loginAttempts'
    >,
    req: AuthRequest,
  ) {
    const nextAttempts = user.loginAttempts + 1;
    const lockedUntil =
      nextAttempts >= this.getLoginMaxAttempts()
        ? new Date(Date.now() + this.getLoginLockMinutes() * 60 * 1000)
        : null;

    await this.authRepository.incrementLoginAttempts(user.id, lockedUntil);

    await this.securityEvents.recordFailedLogin({
      actorId: user.id,
      role: user.role,
      tenantId: user.tenantId,
      ipAddress: req.ip ?? null,
      metadata: {
        email: user.email,
        attempts: nextAttempts,
        lockedUntil: lockedUntil?.toISOString() ?? null,
      },
    });

    if (lockedUntil) {
      await this.securityEvents.recordAccountLocked({
        actorId: user.id,
        role: user.role,
        tenantId: user.tenantId,
        ipAddress: req.ip ?? null,
        metadata: {
          email: user.email,
          attempts: nextAttempts,
          lockedUntil: lockedUntil.toISOString(),
        },
      });
    }
  }

  private signAccessToken(user: AuthUser) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      permissions: user.permissions,
    });
  }

  private async signRefreshToken(user: AuthUser, sessionId: string) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        permissions: user.permissions,
        sid: sessionId,
        type: 'refresh',
      } satisfies RefreshTokenPayload,
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
      token,
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      },
    );

    if (payload.type !== 'refresh' || !payload.sid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return payload;
  }

  private async getValidSession(
    sessionId: string,
    refreshToken: string,
    req: AuthRequest,
  ) {
    const session = await this.authRepository.findSessionById(sessionId);

    if (!session || session.isRevoked || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenMatches = await verifyPassword(
      refreshToken,
      session.refreshTokenHash,
    );

    if (!tokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const resolvedTenantId = this.resolveTenantId(req);
    if (
      session.user.role !== UserRole.SUPER_ADMIN &&
      resolvedTenantId &&
      session.user.tenantId !== resolvedTenantId
    ) {
      await this.securityEvents.recordTenantContextMismatch({
        actorId: session.user.id,
        role: session.user.role,
        tenantId: session.user.tenantId,
        metadata: {
          resolvedTenantId,
          tokenTenantId: session.user.tenantId,
          source: 'refresh',
        },
      });
      throw new UnauthorizedException('Tenant context mismatch');
    }

    return session;
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, this.getAccessCookieOptions());
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      this.getRefreshCookieOptions(),
    );
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api' });
  }

  private getAccessCookieOptions() {
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax' as const,
      path: '/',
      maxAge: this.parseDurationToMs(
        this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      ),
    };
  }

  private getRefreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax' as const,
      path: '/api',
      maxAge: this.parseDurationToMs(
        this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      ),
    };
  }

  private getRefreshExpiresAt() {
    return new Date(
      Date.now() +
        this.parseDurationToMs(this.config.get('JWT_REFRESH_EXPIRES_IN', '7d')),
    );
  }

  private parseDurationToMs(duration: string) {
    const normalized = duration.trim();
    const numericValue = Number(normalized);

    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }

    const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/i);
    if (!match) {
      throw new BadRequestException(`Invalid duration: ${duration}`);
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }

  private isProduction() {
    return this.config.get<string>('NODE_ENV', 'development') === 'production';
  }

  private getLoginMaxAttempts() {
    return this.config.get<number>('LOGIN_MAX_ATTEMPTS', 5);
  }

  private getLoginLockMinutes() {
    return this.config.get<number>('LOGIN_LOCK_MINUTES', 15);
  }
}
