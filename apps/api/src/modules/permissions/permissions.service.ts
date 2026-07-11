import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JwtPayload,
  Permission,
  PERMISSION_CATALOG,
  PERMISSION_PRESETS,
  PermissionMeta,
  PermissionPreset,
  UserRole,
} from '@zentic/shared-types';
import { PermissionsRepository } from './permissions.repository';
import { assertTenantContext } from '../../common/security/assert-tenant-context';

const ALL_PERMISSION_CODES = Object.keys(PERMISSION_CATALOG) as Permission[];

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepo: PermissionsRepository) {}

  getCatalog(): PermissionMeta[] {
    return Object.values(PERMISSION_CATALOG);
  }

  getPresets(): PermissionPreset[] {
    return PERMISSION_PRESETS;
  }

  /**
   * SUPER_ADMIN/TENANT_ADMIN tienen todos los permisos de su ámbito por defecto (§4). El
   * PermissionGuard del backend ya hace este mismo bypass por rol al validar rutas — este método
   * es para cuando de verdad se necesita el set "efectivo" (ej. mostrarlo en la UI de edición).
   */
  async getEffectivePermissions(
    userId: string,
    role: UserRole,
  ): Promise<Permission[]> {
    if (role === UserRole.SUPER_ADMIN || role === UserRole.TENANT_ADMIN) {
      return ALL_PERMISSION_CODES;
    }
    const granted = await this.permissionsRepo.findGrantedPermissions(userId);
    return granted as Permission[];
  }

  async getUserPermissions(tenantId: string | null, userId: string) {
    assertTenantContext(tenantId);
    const target = await this.permissionsRepo.findUserById(tenantId, userId);
    if (!target) throw new NotFoundException('Usuario no encontrado');

    const permissions = await this.getEffectivePermissions(
      target.id,
      target.role,
    );
    return { userId: target.id, role: target.role, permissions };
  }

  async setUserPermissions(
    actor: JwtPayload,
    targetUserId: string,
    requested: string[],
  ) {
    assertTenantContext(actor.tenantId);
    const target = await this.permissionsRepo.findUserById(
      actor.tenantId,
      targetUserId,
    );
    if (!target) throw new NotFoundException('Usuario no encontrado');

    // RN-RBAC-002: el SUPER_ADMIN no se gestiona desde el panel de una funeraria.
    if (target.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'El Super Admin no puede gestionarse desde este panel',
      );
    }
    // RF-RBAC-001: solo se asignan permisos a OPERATOR/VIEWER (TENANT_ADMIN ya tiene todo).
    if (target.role === UserRole.TENANT_ADMIN) {
      throw new BadRequestException(
        'Solo se pueden asignar permisos a usuarios OPERATOR o VIEWER',
      );
    }

    const unknownCodes = requested.filter(
      (code) => !PERMISSION_CATALOG[code as Permission],
    );
    if (unknownCodes.length) {
      throw new BadRequestException(
        `Permisos inválidos: ${unknownCodes.join(', ')}`,
      );
    }

    // RN-RBAC-001: un actor no puede otorgar permisos que él mismo no posee.
    const actorPermissions = await this.getEffectivePermissions(
      actor.sub,
      actor.role,
    );
    const beyondActor = requested.filter(
      (code) => !actorPermissions.includes(code as Permission),
    );
    if (beyondActor.length) {
      throw new ForbiddenException(
        `No tienes estos permisos, no puedes asignarlos: ${beyondActor.join(', ')}`,
      );
    }

    // RN-RBAC-003 (VIEWER nunca permisos de escritura) y matriz §5 (qué es asignable a OPERATOR).
    const assignabilityField =
      target.role === UserRole.VIEWER
        ? 'assignableToViewer'
        : 'assignableToOperator';
    const notAssignable = requested.filter(
      (code) => !PERMISSION_CATALOG[code as Permission][assignabilityField],
    );
    if (notAssignable.length) {
      throw new BadRequestException(
        `Estos permisos no son asignables a un usuario ${target.role}: ${notAssignable.join(', ')}`,
      );
    }

    const current = await this.permissionsRepo.findGrantedPermissions(
      target.id,
    );
    const requestedSet = new Set(requested);
    const currentSet = new Set(current);

    const toGrant = requested.filter((code) => !currentSet.has(code));
    const toRevoke = current.filter((code) => !requestedSet.has(code));

    if (toGrant.length || toRevoke.length) {
      await this.permissionsRepo.replacePermissions(
        actor.sub,
        target.tenantId ?? actor.tenantId ?? '',
        target.id,
        toGrant,
        toRevoke,
      );
    }

    return {
      userId: target.id,
      role: target.role,
      permissions: requested as Permission[],
    };
  }

  /**
   * RN-RBAC-003 aplicada a un cambio de rol: si un usuario pasa a ser VIEWER, cualquier permiso
   * de escritura que tuviera concedido se revoca de inmediato (nunca queda un VIEWER con permisos
   * de escritura, sin importar lo que intente el admin).
   */
  async revokeNonAssignableForViewer(
    tenantId: string,
    userId: string,
    actorId: string,
  ): Promise<void> {
    const current = await this.permissionsRepo.findGrantedPermissions(userId);
    const toRevoke = current.filter(
      (code) => !PERMISSION_CATALOG[code as Permission]?.assignableToViewer,
    );
    if (toRevoke.length) {
      await this.permissionsRepo.replacePermissions(
        actorId,
        tenantId,
        userId,
        [],
        toRevoke,
      );
    }
  }
}
