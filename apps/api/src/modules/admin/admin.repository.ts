import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AdminUserRecord {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  lockedUntil: Date | null;
}

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement in Module 05 — Admin General (dashboard/settings/brand quedan pendientes ahí)

  findManyUsers(tenantId: string): Promise<AdminUserRecord[]> {
    return this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lockedUntil: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findUserById(tenantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lockedUntil: true,
      },
    });
  }

  findUserByEmail(tenantId: string, email: string) {
    return this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
  }

  createUser(
    tenantId: string,
    data: { email: string; passwordHash: string; role: 'OPERATOR' | 'VIEWER' },
  ): Promise<AdminUserRecord> {
    return this.prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lockedUntil: true,
      },
    });
  }

  async updateUserRole(
    tenantId: string,
    id: string,
    role: 'OPERATOR' | 'VIEWER',
  ): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id, tenantId },
      data: { role },
    });
  }
}
