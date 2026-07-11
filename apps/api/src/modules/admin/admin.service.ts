import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  AdminDashboardMetrics,
  JwtPayload,
  TenantAccountSettings,
} from '@zentic/shared-types';
import { AdminRepository } from './admin.repository';
import { PermissionsService } from '../permissions/permissions.service';
import { EmailService } from '../email/email.service';
import { FilesService, UploadableFile } from '../files/files.service';
import { hashPassword } from '../../common/security/password.util';
import { assertTenantContext } from '../../common/security/assert-tenant-context';
import {
  getMonthBoundsUtc,
  getTenantDayBoundsUtc,
} from '../../common/utils/date-range.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const DEFAULT_TENANT_TIMEZONE = 'America/Bogota';

const MANAGEABLE_ROLES = ['OPERATOR', 'VIEWER'] as const;

const LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const FAVICON_MAX_SIZE_BYTES = 512 * 1024;

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly permissionsService: PermissionsService,
    private readonly emailService: EmailService,
    private readonly filesService: FilesService,
    private readonly config: ConfigService,
  ) {}

  async getDashboard(tenantId: string): Promise<AdminDashboardMetrics> {
    assertTenantContext(tenantId);

    const accountSettings = await this.adminRepo.findAccountSettings(tenantId);
    const timezone = accountSettings?.timezone ?? DEFAULT_TENANT_TIMEZONE;

    const todayRange = getTenantDayBoundsUtc(timezone);
    const thisMonthRange = getMonthBoundsUtc(0);
    const lastMonthRange = getMonthBoundsUtc(-1);

    const [
      activeEventsToday,
      obituariesPublishedThisMonth,
      pendingMessages,
      leadsThisMonth,
      leadsLastMonth,
      liveViewers,
      totalClients,
    ] = await Promise.all([
      this.adminRepo.countActiveEventsToday(tenantId, todayRange),
      this.adminRepo.countObituariesPublished(tenantId, thisMonthRange),
      this.adminRepo.countPendingMessages(tenantId),
      this.adminRepo.countLeadsInRange(tenantId, thisMonthRange),
      this.adminRepo.countLeadsInRange(tenantId, lastMonthRange),
      this.adminRepo.sumLiveViewers(tenantId),
      this.adminRepo.countActiveClients(tenantId),
    ]);

    const leadsDeltaPercent =
      leadsLastMonth === 0
        ? null
        : Math.round(
            ((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100,
          );

    return {
      activeEventsToday,
      obituariesPublishedThisMonth,
      pendingMessages,
      leadsThisMonth,
      leadsLastMonth,
      leadsDeltaPercent,
      liveViewers,
      totalClients,
    };
  }

  getUsers(tenantId: string) {
    assertTenantContext(tenantId);
    return this.adminRepo.findManyUsers(tenantId);
  }

  async createUser(tenantId: string, actor: JwtPayload, dto: CreateUserDto) {
    assertTenantContext(tenantId);
    const existing = await this.adminRepo.findUserByEmail(tenantId, dto.email);
    if (existing) {
      throw new ConflictException(
        'Ya existe un usuario con ese email en este tenant',
      );
    }

    // TODO(Módulo 05): validar límite de usuarios del plan del tenant (RN-ADMIN-001) antes de crear.

    const temporaryPassword = randomUUID();
    const passwordHash = await hashPassword(temporaryPassword);

    const user = await this.adminRepo.createUser(tenantId, {
      email: dto.email,
      passwordHash,
      role: dto.role,
    });

    let permissions: string[] = [];
    if (dto.permissions?.length) {
      const result = await this.permissionsService.setUserPermissions(
        actor,
        user.id,
        dto.permissions,
      );
      permissions = result.permissions;
    }

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );
    await this.emailService.sendNewUserCredentialsEmail({
      to: user.email,
      loginUrl: `${frontendUrl}/auth/login`,
      temporaryPassword,
    });

    return { ...user, permissions };
  }

  async updateUser(
    tenantId: string,
    actor: JwtPayload,
    id: string,
    dto: UpdateUserDto,
  ) {
    assertTenantContext(tenantId);
    const target = await this.adminRepo.findUserById(tenantId, id);
    if (!target) throw new NotFoundException('Usuario no encontrado');

    if (dto.role && !MANAGEABLE_ROLES.includes(dto.role)) {
      throw new BadRequestException('El rol debe ser OPERATOR o VIEWER');
    }

    if (dto.role) {
      await this.adminRepo.updateUserRole(tenantId, id, dto.role);
      // RN-RBAC-003: si baja a VIEWER y no vienen permisos explícitos en este mismo request,
      // se revoca de inmediato cualquier permiso de escritura que le hubiera quedado concedido.
      if (dto.role === 'VIEWER' && !dto.permissions) {
        await this.permissionsService.revokeNonAssignableForViewer(
          tenantId,
          id,
          actor.sub,
        );
      }
    }

    let permissions: string[] | undefined;
    if (dto.permissions) {
      const result = await this.permissionsService.setUserPermissions(
        actor,
        id,
        dto.permissions,
      );
      permissions = result.permissions;
    }

    return {
      id,
      ...(dto.role ? { role: dto.role } : {}),
      ...(permissions ? { permissions } : {}),
    };
  }

  async getSettings(tenantId: string): Promise<TenantAccountSettings> {
    assertTenantContext(tenantId);
    const settings = await this.adminRepo.findAccountSettings(tenantId);
    return {
      timezone: settings?.timezone ?? DEFAULT_TENANT_TIMEZONE,
      locale: settings?.locale ?? 'es',
      notifyNewLead: settings?.notifyNewLead ?? true,
      notifyPendingMessages: settings?.notifyPendingMessages ?? true,
      notifyWeeklySummary: settings?.notifyWeeklySummary ?? false,
      requireAccessCodeDefault: settings?.requireAccessCodeDefault ?? false,
    };
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto) {
    assertTenantContext(tenantId);
    return this.adminRepo.upsertAccountSettings(tenantId, dto);
  }

  async updateBrand(tenantId: string, dto: UpdateBrandDto) {
    assertTenantContext(tenantId);
    return this.adminRepo.upsertBrandConfig(tenantId, dto);
  }

  async uploadBrandLogo(tenantId: string, file: UploadableFile) {
    assertTenantContext(tenantId);
    return this.uploadBrandAsset(
      tenantId,
      file,
      'logoUrl',
      LOGO_MAX_SIZE_BYTES,
    );
  }

  async uploadBrandFavicon(tenantId: string, file: UploadableFile) {
    assertTenantContext(tenantId);
    return this.uploadBrandAsset(
      tenantId,
      file,
      'faviconUrl',
      FAVICON_MAX_SIZE_BYTES,
    );
  }

  private async uploadBrandAsset(
    tenantId: string,
    file: UploadableFile,
    field: 'logoUrl' | 'faviconUrl',
    maxSizeBytes: number,
  ) {
    const existing = await this.adminRepo.findBrandConfig(tenantId);
    const url = await this.filesService.upload(file, `brand/${tenantId}`, {
      maxSizeBytes,
    });

    const updated = await this.adminRepo.upsertBrandConfig(tenantId, {
      [field]: url,
    });

    const previousUrl = existing?.[field];
    if (previousUrl && previousUrl !== url) {
      await this.filesService.delete(previousUrl);
    }

    return updated;
  }
}
