import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, JwtPayload, TenantModuleKey } from '@zentic/shared-types';
import { MODULE_KEY } from '../decorators/require-module.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

type TenantModuleRequest = {
  user?: JwtPayload;
  tenantId?: string;
};

/**
 * Segundo nivel de acceso, por encima de PermissionGuard: el Super Admin
 * decide qué módulos completos tiene disponibles un tenant. A diferencia de
 * PermissionGuard, aquí NO hay bypass para TENANT_ADMIN — la restricción
 * aplica al tenant completo, incluido su propio admin.
 */
@Injectable()
export class TenantModuleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredModule = this.reflector.getAllAndOverride<TenantModuleKey>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredModule) return true;

    const request = context.switchToHttp().getRequest<TenantModuleRequest>();
    const user = request.user;
    if (!user) return false;

    // SUPER_ADMIN bypasea, salvo que esté impersonando: en ese caso queda
    // sujeto a las restricciones del tenant impersonado, igual que TenantGuard.
    if (user.role === UserRole.SUPER_ADMIN && !user.impersonatedTenantId) {
      return true;
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('No tenant context found');
    }

    const flag = await this.prisma.tenantFeatureFlag.findUnique({
      where: { tenantId_feature: { tenantId, feature: requiredModule } },
    });

    if (!flag?.enabled) {
      throw new ForbiddenException(`El módulo "${requiredModule}" no está habilitado para este tenant`);
    }
    return true;
  }
}
