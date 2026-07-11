import { Injectable } from '@nestjs/common';
import { UserRole } from '@zentic/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

export interface TargetUser {
  id: string;
  role: UserRole;
  tenantId: string | null;
}

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(tenantId: string | null, userId: string): Promise<TargetUser | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, role: true, tenantId: true },
    });
    // Prisma genera su propio enum UserRole (mismos valores) — se homologa al de shared-types.
    return user as unknown as TargetUser | null;
  }

  async findGrantedPermissions(userId: string): Promise<string[]> {
    const rows = await this.prisma.userPermission.findMany({
      where: { userId },
      select: { permission: true },
    });
    return rows.map(row => row.permission);
  }

  async replacePermissions(
    actorId: string,
    targetTenantId: string,
    userId: string,
    toGrant: string[],
    toRevoke: string[],
  ): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction([
      ...(toRevoke.length
        ? [
            this.prisma.userPermission.deleteMany({
              where: { userId, permission: { in: toRevoke } },
            }),
          ]
        : []),
      ...(toGrant.length
        ? [
            this.prisma.userPermission.createMany({
              data: toGrant.map(permission => ({ userId, permission, grantedBy: actorId })),
            }),
          ]
        : []),
      ...(toGrant.length || toRevoke.length
        ? [
            this.prisma.permissionAuditLog.createMany({
              data: [
                ...toGrant.map(permission => ({
                  actorId,
                  targetId: userId,
                  action: 'GRANTED',
                  permission,
                  tenantId: targetTenantId,
                  createdAt: now,
                })),
                ...toRevoke.map(permission => ({
                  actorId,
                  targetId: userId,
                  action: 'REVOKED',
                  permission,
                  tenantId: targetTenantId,
                  createdAt: now,
                })),
              ],
            }),
          ]
        : []),
    ]);
  }
}
