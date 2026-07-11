import { Injectable } from '@nestjs/common';
import { Prisma, TenantPlan, TenantStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_EVENT_STATUSES = ['SCHEDULED', 'LIVE', 'PAUSED'] as const;

export interface TenantListFilters {
  status?: TenantStatus;
  plan?: TenantPlan;
  search?: string;
  page: number;
  limit: number;
}

export interface AuditLogFilters {
  tenantId?: string;
  actorId?: string;
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

@Injectable()
export class SuperAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTenants(filters: TenantListFilters) {
    const where = this.buildTenantWhere(filters);
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { data, total };
  }

  findTenantById(id: string) {
    return this.prisma.tenant.findFirst({ where: { id, deletedAt: null } });
  }

  findTenantBySlug(slug: string) {
    return this.prisma.tenant.findFirst({ where: { slug, deletedAt: null } });
  }

  async createTenantWithAdmin(data: {
    name: string;
    slug: string;
    country?: string;
    plan: TenantPlan;
    adminEmail: string;
    adminPasswordHash: string;
    actorId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          country: data.country,
          plan: data.plan,
          status: TenantStatus.ACTIVE,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          email: data.adminEmail,
          passwordHash: data.adminPasswordHash,
          role: UserRole.TENANT_ADMIN,
          tenantId: tenant.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: data.actorId,
          role: UserRole.SUPER_ADMIN,
          action: 'TENANT_CREATED',
          entityType: 'Tenant',
          entityId: tenant.id,
          tenantId: tenant.id,
          metadata: { slug: tenant.slug, plan: tenant.plan },
        },
      });

      return { tenant, adminUserId: adminUser.id };
    });
  }

  async updateTenant(
    id: string,
    data: { name?: string; country?: string; plan?: TenantPlan },
    actorId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          actorId,
          role: UserRole.SUPER_ADMIN,
          action: 'TENANT_UPDATED',
          entityType: 'Tenant',
          entityId: id,
          tenantId: id,
          metadata: data,
        },
      });
      return tenant;
    });
  }

  async suspendTenant(id: string, reason: string | undefined, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id },
        data: {
          status: TenantStatus.SUSPENDED,
          suspendedAt: new Date(),
          suspendReason: reason ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          role: UserRole.SUPER_ADMIN,
          action: 'TENANT_SUSPENDED',
          entityType: 'Tenant',
          entityId: id,
          tenantId: id,
          metadata: { reason: reason ?? null },
        },
      });
      return tenant;
    });
  }

  async reactivateTenant(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id },
        data: {
          status: TenantStatus.ACTIVE,
          suspendedAt: null,
          suspendReason: null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          role: UserRole.SUPER_ADMIN,
          action: 'TENANT_REACTIVATED',
          entityType: 'Tenant',
          entityId: id,
          tenantId: id,
        },
      });
      return tenant;
    });
  }

  async softDeleteTenant(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id },
        data: { status: TenantStatus.DELETED, deletedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          role: UserRole.SUPER_ADMIN,
          action: 'TENANT_DELETED',
          entityType: 'Tenant',
          entityId: id,
          tenantId: id,
        },
      });
      return tenant;
    });
  }

  countActiveEventsForTenant(tenantId: string) {
    return this.prisma.event.count({
      where: { tenantId, status: { in: [...ACTIVE_EVENT_STATUSES] } },
    });
  }

  findTenantAdmin(tenantId: string) {
    return this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.TENANT_ADMIN, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { email: true },
    });
  }

  countUsersForTenant(tenantId: string) {
    return this.prisma.user.count({ where: { tenantId, deletedAt: null } });
  }

  countEventsForTenant(tenantId: string) {
    return this.prisma.event.count({ where: { tenantId } });
  }

  async createImpersonationLog(data: {
    superAdminId: string;
    tenantId: string;
    reason: string;
  }) {
    const log = await this.prisma.impersonationLog.create({ data });
    await this.prisma.auditLog.create({
      data: {
        actorId: data.superAdminId,
        role: UserRole.SUPER_ADMIN,
        action: 'IMPERSONATION_STARTED',
        entityType: 'Tenant',
        entityId: data.tenantId,
        tenantId: data.tenantId,
        metadata: { reason: data.reason, impersonationLogId: log.id },
      },
    });
    return log;
  }

  findImpersonationLogById(id: string) {
    return this.prisma.impersonationLog.findUnique({ where: { id } });
  }

  async endImpersonationLog(id: string, actorId: string, tenantId: string) {
    const log = await this.prisma.impersonationLog.update({
      where: { id },
      data: { endedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        role: UserRole.SUPER_ADMIN,
        action: 'IMPERSONATION_ENDED',
        entityType: 'Tenant',
        entityId: tenantId,
        tenantId,
        metadata: { impersonationLogId: id },
      },
    });
    return log;
  }

  findSuperAdmins() {
    return this.prisma.user.findMany({
      where: { role: UserRole.SUPER_ADMIN },
      select: {
        id: true,
        email: true,
        createdAt: true,
        deletedAt: true,
        lockedUntil: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findSuperAdminByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, tenantId: null, role: UserRole.SUPER_ADMIN },
    });
  }

  findSuperAdminById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, tenantId: null, role: UserRole.SUPER_ADMIN },
    });
  }

  createSuperAdmin(email: string, passwordHash: string) {
    return this.prisma.user.create({
      data: { email, passwordHash, role: UserRole.SUPER_ADMIN, tenantId: null },
    });
  }

  countActiveSuperAdmins(excludingId?: string) {
    return this.prisma.user.count({
      where: {
        role: UserRole.SUPER_ADMIN,
        deletedAt: null,
        ...(excludingId ? { id: { not: excludingId } } : {}),
      },
    });
  }

  async setSuperAdminActive(id: string, active: boolean, actorId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: active ? null : new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        role: UserRole.SUPER_ADMIN,
        action: active ? 'SUPER_ADMIN_REACTIVATED' : 'SUPER_ADMIN_DEACTIVATED',
        entityType: 'User',
        entityId: id,
      },
    });
    return user;
  }

  async getDashboardMetrics() {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const [
      tenantsByStatus,
      liveEvents,
      obituariesToday,
      obituariesThisWeek,
      totalUsers,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.tenant.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.event.count({ where: { status: 'LIVE' } }),
      this.prisma.obituary.count({
        where: { status: 'PUBLISHED', publishedAt: { gte: startOfToday } },
      }),
      this.prisma.obituary.count({
        where: { status: 'PUBLISHED', publishedAt: { gte: startOfWeek } },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      tenantsByStatus,
      liveEvents,
      obituariesToday,
      obituariesThisWeek,
      totalUsers,
      recentAuditLogs,
    };
  }

  async findAuditLogs(
    filters: AuditLogFilters & { page: number; limit: number },
  ) {
    const where = this.buildAuditLogWhere(filters);
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total };
  }

  findAuditLogsForExport(filters: AuditLogFilters) {
    const where = this.buildAuditLogWhere(filters);
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
  }

  private buildTenantWhere(
    filters: TenantListFilters,
  ): Prisma.TenantWhereInput {
    return {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.plan ? { plan: filters.plan } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { slug: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private buildAuditLogWhere(
    filters: AuditLogFilters,
  ): Prisma.AuditLogWhereInput {
    return {
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };
  }
}
