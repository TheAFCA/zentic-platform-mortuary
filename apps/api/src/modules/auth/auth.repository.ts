import { Injectable } from '@nestjs/common';
import { Permission, TenantStatus, UserRole } from '@zentic/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

type UserPermissionRecord = { permission: string };

type TenantFeatureFlagRecord = { feature: string; enabled: boolean };

type AuthUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  tenantId: string | null;
  tenant: { status: TenantStatus; featureFlags: TenantFeatureFlagRecord[] } | null;
  lockedUntil: Date | null;
  loginAttempts: number;
  permissions: UserPermissionRecord[];
};

type SessionRecord = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  device: string | null;
  ipAddress: string | null;
  isRevoked: boolean;
  expiresAt: Date;
  user: AuthUserRecord;
};

type PasswordResetRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  usedAt: Date | null;
  expiresAt: Date;
  user: AuthUserRecord;
};

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserForLogin(email: string, tenantId: string | null) {
    return this.prisma.user.findFirst({
      where: { email, tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        tenantId: true,
        tenant: {
          select: { status: true, featureFlags: { select: { feature: true, enabled: true } } },
        },
        lockedUntil: true,
        loginAttempts: true,
        permissions: {
          select: { permission: true },
        },
      },
    }) as Promise<AuthUserRecord | null>;
  }

  findUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        tenantId: true,
        tenant: {
          select: { status: true, featureFlags: { select: { feature: true, enabled: true } } },
        },
        lockedUntil: true,
        loginAttempts: true,
        permissions: {
          select: { permission: true },
        },
      },
    }) as Promise<AuthUserRecord | null>;
  }

  findTenantFeatureFlags(tenantId: string): Promise<TenantFeatureFlagRecord[]> {
    return this.prisma.tenantFeatureFlag.findMany({
      where: { tenantId },
      select: { feature: true, enabled: true },
    });
  }

  findSessionById(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        device: true,
        ipAddress: true,
        isRevoked: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            tenantId: true,
            tenant: {
              select: { status: true },
            },
            lockedUntil: true,
            loginAttempts: true,
            permissions: {
              select: { permission: true },
            },
          },
        },
      },
    }) as Promise<SessionRecord | null>;
  }

  findPasswordResetByTokenHash(tokenHash: string) {
    return this.prisma.passwordReset.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        usedAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            tenantId: true,
            tenant: {
              select: { status: true },
            },
            lockedUntil: true,
            loginAttempts: true,
            permissions: {
              select: { permission: true },
            },
          },
        },
      },
    }) as Promise<PasswordResetRecord | null>;
  }

  async createSession(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    device?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }) {
    return this.prisma.session.create({
      data: {
        id: data.id,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        device: data.device ?? null,
        ipAddress: data.ipAddress ?? null,
        expiresAt: data.expiresAt,
      },
    });
  }

  async updateSessionRefreshToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash,
        expiresAt,
      },
    });
  }

  async revokeSession(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });
  }

  async revokeUserSessions(userId: string) {
    return this.prisma.session.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async deleteUnusedPasswordResets(userId: string) {
    return this.prisma.passwordReset.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    });
  }

  async createPasswordReset(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.passwordReset.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async markPasswordResetUsed(id: string) {
    return this.prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async updateLoginState(
    userId: string,
    data: { loginAttempts: number; lockedUntil: Date | null },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async resetPasswordState(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async incrementLoginAttempts(userId: string, lockedUntil: Date | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: { increment: 1 },
        lockedUntil,
      },
    });
  }

  toPermissions(records: UserPermissionRecord[]): Permission[] {
    return records.map((record) => record.permission as Permission);
  }
}
