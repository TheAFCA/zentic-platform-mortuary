import { Injectable } from '@nestjs/common';
import { Permission, TenantStatus, UserRole } from '@zentic/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

type UserPermissionRecord = { permission: string };

type AuthUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  tenantId: string | null;
  tenant: { status: TenantStatus } | null;
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
          select: { status: true },
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
          select: { status: true },
        },
        lockedUntil: true,
        loginAttempts: true,
        permissions: {
          select: { permission: true },
        },
      },
    }) as Promise<AuthUserRecord | null>;
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
