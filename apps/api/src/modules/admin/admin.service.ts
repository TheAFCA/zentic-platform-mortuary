import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { JwtPayload } from '@zentic/shared-types';
import { AdminRepository } from './admin.repository';
import { PermissionsService } from '../permissions/permissions.service';
import { EmailService } from '../email/email.service';
import { hashPassword } from '../../common/security/password.util';
import { assertTenantContext } from '../../common/security/assert-tenant-context';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const MANAGEABLE_ROLES = ['OPERATOR', 'VIEWER'] as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly permissionsService: PermissionsService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // TODO: Implement in Module 05 — Admin General
  getDashboard(_tenantId: string) {
    throw new Error('Not implemented');
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

  getSettings(_tenantId: string) {
    throw new Error('Not implemented');
  }
  updateSettings(_tenantId: string, _dto: unknown) {
    throw new Error('Not implemented');
  }
  updateBrand(_tenantId: string, _dto: unknown) {
    throw new Error('Not implemented');
  }
}
