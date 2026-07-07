import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotImplementedException,
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

type AuthUserRecord = NonNullable<
  Awaited<ReturnType<AuthRepository['findUserForLogin']>>
>;

type AuthSessionRecord = NonNullable<
  Awaited<ReturnType<AuthRepository['findSessionById']>>
>;

type AuthRequest = Omit<Request, 'cookies'> & {
  resolvedTenantId?: string;
  tenantId?: string;
  cookies?: Record<string, string | undefined>;
};

type RefreshTokenPayload = JwtPayload & { sid: string; type: 'refresh' };

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const LOGIN_LOCK_MINUTES = 15;
const LOGIN_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertUserCanAuthenticate(user, tenantId);
    this.assertTenantIsActive(user);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is temporarily locked');
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, user.loginAttempts);
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

  async forgotPassword(_email: string) {
    throw new NotImplementedException('Forgot password is not part of HU2');
  }

  async resetPassword(_token: string, _newPassword: string) {
    throw new NotImplementedException('Reset password is not part of HU2');
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
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

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

  private async handleFailedLogin(userId: string, currentAttempts: number) {
    const nextAttempts = currentAttempts + 1;
    const lockedUntil =
      nextAttempts >= LOGIN_MAX_ATTEMPTS
        ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000)
        : null;

    await this.authRepository.incrementLoginAttempts(userId, lockedUntil);
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
    const cookieOptions = { path: '/api' };
    res.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions);
    res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
  }

  private getAccessCookieOptions() {
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax' as const,
      path: '/api',
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
}
