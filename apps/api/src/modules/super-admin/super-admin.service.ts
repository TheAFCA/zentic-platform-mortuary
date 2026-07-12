import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  AuditLogEntry,
  ImpersonationSession,
  JwtPayload,
  PaginatedResponse,
  Tenant as TenantDto,
  TenantPlan,
  TenantStatus,
  UserRole,
} from '@zentic/shared-types';
import { SuperAdminRepository } from './super-admin.repository';
import { EmailService } from '../email/email.service';
import { hashPassword } from '../../common/security/password.util';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SuspendTenantDto } from './dto/suspend-tenant.dto';
import { ImpersonateTenantDto } from './dto/impersonate-tenant.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';

const IMPERSONATION_EXPIRES_IN = '30m';

type TenantRecord = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  plan: string;
  status: string;
  suspendedAt: Date | null;
  suspendReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuditLogRecord = {
  id: string;
  actorId: string;
  role: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  tenantId: string | null;
  createdAt: Date;
};

export interface TenantListQuery {
  status?: TenantStatus;
  plan?: TenantPlan;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async getDashboard() {
    const metrics = await this.superAdminRepo.getDashboardMetrics();
    const tenantCounts = Object.fromEntries(
      metrics.tenantsByStatus.map((row) => [row.status, row._count._all]),
    ) as Record<string, number>;

    return {
      tenants: {
        active: tenantCounts[TenantStatus.ACTIVE] ?? 0,
        suspended: tenantCounts[TenantStatus.SUSPENDED] ?? 0,
        trial: tenantCounts[TenantStatus.TRIAL] ?? 0,
      },
      liveEvents: metrics.liveEvents,
      obituariesPublishedToday: metrics.obituariesToday,
      obituariesPublishedThisWeek: metrics.obituariesThisWeek,
      totalUsers: metrics.totalUsers,
      recentAuditLogs: metrics.recentAuditLogs.map((log) =>
        this.toAuditLogEntry(log),
      ),
    };
  }

  async getTenants(
    query: TenantListQuery,
  ): Promise<PaginatedResponse<TenantDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const { data, total } = await this.superAdminRepo.findTenants({
      status: query.status,
      plan: query.plan,
      search: query.search,
      page,
      limit,
    });

    return this.toPaginated(
      data.map((tenant) => this.toTenantDto(tenant)),
      total,
      page,
      limit,
    );
  }

  async getTenant(id: string) {
    const tenant = await this.superAdminRepo.findTenantById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const [usersCount, eventsCount] = await Promise.all([
      this.superAdminRepo.countUsersForTenant(id),
      this.superAdminRepo.countEventsForTenant(id),
    ]);

    return {
      ...this.toTenantDto(tenant),
      usage: { users: usersCount, events: eventsCount },
    };
  }

  async createTenant(actor: JwtPayload, dto: CreateTenantDto) {
    const existing = await this.superAdminRepo.findTenantBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(
        'Este identificador ya está en uso. Elige otro.',
      );
    }

    const temporaryPassword = randomUUID();
    const adminPasswordHash = await hashPassword(temporaryPassword);

    const { tenant, adminUserId } =
      await this.superAdminRepo.createTenantWithAdmin({
        name: dto.name,
        slug: dto.slug,
        country: dto.country,
        plan: dto.plan,
        adminEmail: dto.adminEmail,
        adminPasswordHash,
        actorId: actor.sub,
      });

    await this.emailService.sendNewUserCredentialsEmail({
      to: dto.adminEmail,
      loginUrl: this.buildTenantLoginUrl(tenant.slug),
      temporaryPassword,
    });

    return { ...this.toTenantDto(tenant), adminUserId };
  }

  async updateTenant(id: string, actor: JwtPayload, dto: UpdateTenantDto) {
    const tenant = await this.superAdminRepo.findTenantById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const updated = await this.superAdminRepo.updateTenant(id, dto, actor.sub);
    return this.toTenantDto(updated);
  }

  async suspendTenant(id: string, actor: JwtPayload, dto: SuspendTenantDto) {
    const tenant = await this.superAdminRepo.findTenantById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const updated = await this.superAdminRepo.suspendTenant(
      id,
      dto.reason,
      actor.sub,
    );

    const admin = await this.superAdminRepo.findTenantAdmin(id);
    if (admin) {
      await this.emailService.sendTenantSuspendedEmail({
        to: admin.email,
        tenantName: tenant.name,
        reason: dto.reason,
      });
    }

    return this.toTenantDto(updated);
  }

  async reactivateTenant(id: string, actor: JwtPayload) {
    const tenant = await this.superAdminRepo.findTenantById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const updated = await this.superAdminRepo.reactivateTenant(id, actor.sub);

    const admin = await this.superAdminRepo.findTenantAdmin(id);
    if (admin) {
      await this.emailService.sendTenantReactivatedEmail({
        to: admin.email,
        tenantName: tenant.name,
        loginUrl: this.buildTenantLoginUrl(tenant.slug),
      });
    }

    return this.toTenantDto(updated);
  }

  async deleteTenant(id: string, actor: JwtPayload) {
    const tenant = await this.superAdminRepo.findTenantById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const activeEvents =
      await this.superAdminRepo.countActiveEventsForTenant(id);
    if (activeEvents > 0) {
      throw new ConflictException(
        'No se puede eliminar un tenant con eventos activos. Primero debe suspenderlo.',
      );
    }

    const updated = await this.superAdminRepo.softDeleteTenant(id, actor.sub);
    return this.toTenantDto(updated);
  }

  async impersonate(
    tenantId: string,
    actor: JwtPayload,
    dto: ImpersonateTenantDto,
  ): Promise<ImpersonationSession> {
    const tenant = await this.superAdminRepo.findTenantById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const log = await this.superAdminRepo.createImpersonationLog({
      superAdminId: actor.sub,
      tenantId,
      reason: dto.reason,
    });

    const accessToken = this.jwtService.sign(
      {
        sub: actor.sub,
        email: actor.email,
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        permissions: [],
        impersonatedTenantId: tenantId,
        impersonationLogId: log.id,
      } satisfies JwtPayload,
      { expiresIn: IMPERSONATION_EXPIRES_IN },
    );

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    return {
      accessToken,
      expiresAt,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      impersonationLogId: log.id,
    };
  }

  async endImpersonation(logId: string, actor: JwtPayload) {
    const log = await this.superAdminRepo.findImpersonationLogById(logId);
    if (!log)
      throw new NotFoundException('Sesión de impersonación no encontrada');
    if (log.superAdminId !== actor.sub) {
      throw new ForbiddenException(
        'No puedes finalizar una sesión de impersonación de otro Super Admin',
      );
    }

    if (!log.endedAt) {
      await this.superAdminRepo.endImpersonationLog(
        logId,
        actor.sub,
        log.tenantId,
      );
    }
    return { ended: true };
  }

  async getAuditLogs(
    query: AuditLogQueryDto,
  ): Promise<PaginatedResponse<AuditLogEntry>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const { data, total } = await this.superAdminRepo.findAuditLogs({
      tenantId: query.tenantId,
      actorId: query.actorId,
      action: query.action,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page,
      limit,
    });

    return this.toPaginated(
      data.map((log) => this.toAuditLogEntry(log)),
      total,
      page,
      limit,
    );
  }

  async exportAuditLogsCsv(query: AuditLogQueryDto): Promise<string> {
    const rows = await this.superAdminRepo.findAuditLogsForExport({
      tenantId: query.tenantId,
      actorId: query.actorId,
      action: query.action,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });

    const header = [
      'id',
      'actorId',
      'role',
      'action',
      'entityType',
      'entityId',
      'tenantId',
      'ipAddress',
      'createdAt',
    ];
    const lines = rows.map((row) =>
      [
        row.id,
        row.actorId,
        row.role,
        row.action,
        row.entityType ?? '',
        row.entityId ?? '',
        row.tenantId ?? '',
        row.ipAddress ?? '',
        row.createdAt.toISOString(),
      ]
        .map((value) => this.escapeCsvValue(String(value)))
        .join(','),
    );

    return [header.join(','), ...lines].join('\n');
  }

  async getUsers() {
    const superAdmins = await this.superAdminRepo.findSuperAdmins();
    return superAdmins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      active: admin.deletedAt === null,
      createdAt: admin.createdAt,
    }));
  }

  async createSuperAdmin(actor: JwtPayload, dto: CreateSuperAdminDto) {
    const existing = await this.superAdminRepo.findSuperAdminByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe un Super Admin con ese email');
    }

    const temporaryPassword = randomUUID();
    const passwordHash = await hashPassword(temporaryPassword);
    const created = await this.superAdminRepo.createSuperAdmin(
      dto.email,
      passwordHash,
    );

    await this.emailService.sendNewUserCredentialsEmail({
      to: dto.email,
      loginUrl: this.buildSuperAdminLoginUrl(),
      temporaryPassword,
    });

    return {
      id: created.id,
      email: created.email,
      active: true,
      createdAt: created.createdAt,
    };
  }

  async updateSuperAdmin(
    id: string,
    actor: JwtPayload,
    dto: UpdateSuperAdminDto,
  ) {
    const target = await this.superAdminRepo.findSuperAdminById(id);
    if (!target) throw new NotFoundException('Super Admin no encontrado');

    if (!dto.active) {
      const remainingActive =
        await this.superAdminRepo.countActiveSuperAdmins(id);
      if (remainingActive < 1) {
        throw new ConflictException(
          'Debe existir al menos un Super Admin activo',
        );
      }
    }

    const updated = await this.superAdminRepo.setSuperAdminActive(
      id,
      dto.active,
      actor.sub,
    );

    return {
      id: updated.id,
      email: updated.email,
      active: updated.deletedAt === null,
    };
  }

  private buildTenantLoginUrl(slug: string): string {
    const frontendUrl = new URL(
      this.config.get<string>('FRONTEND_URL', 'http://localhost:4200'),
    );
    const platformDomain = this.config.get<string>(
      'PLATFORM_DOMAIN',
      'localhost',
    );
    frontendUrl.hostname = `${slug}.${platformDomain}`;
    frontendUrl.pathname = '/auth/login';
    frontendUrl.search = '';
    frontendUrl.hash = '';
    return frontendUrl.toString();
  }

  private buildSuperAdminLoginUrl(): string {
    const frontendUrl = new URL(
      this.config.get<string>('FRONTEND_URL', 'http://localhost:4200'),
    );
    frontendUrl.pathname = '/super-admin/login';
    frontendUrl.search = '';
    frontendUrl.hash = '';
    return frontendUrl.toString();
  }

  private escapeCsvValue(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private toTenantDto(tenant: TenantRecord): TenantDto {
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      country: tenant.country,
      plan: tenant.plan as TenantPlan,
      status: tenant.status as TenantStatus,
      suspendedAt: tenant.suspendedAt?.toISOString() ?? null,
      suspendReason: tenant.suspendReason,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }

  private toAuditLogEntry(log: AuditLogRecord): AuditLogEntry {
    return {
      id: log.id,
      actorId: log.actorId,
      role: log.role as UserRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: (log.metadata as Record<string, unknown> | null) ?? null,
      ipAddress: log.ipAddress,
      tenantId: log.tenantId,
      createdAt: log.createdAt.toISOString(),
    };
  }

  private toPaginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
