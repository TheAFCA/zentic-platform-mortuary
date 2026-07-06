import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, Permission, JwtPayload } from '@zentic/shared-types';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions?.length) return true;

    const user = context.switchToHttp().getRequest().user as JwtPayload;
    if (!user) return false;

    // SUPER_ADMIN and TENANT_ADMIN bypass permission checks
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.TENANT_ADMIN
    ) {
      return true;
    }

    const hasPermission = requiredPermissions.some((p) =>
      user.permissions?.includes(p),
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing permission: ${requiredPermissions.join(' or ')}`,
      );
    }
    return true;
  }
}
