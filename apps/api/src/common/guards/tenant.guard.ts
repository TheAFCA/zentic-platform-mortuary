import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, JwtPayload } from '@zentic/shared-types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) return false;

    // Super admins bypass tenant isolation
    if (user.role === UserRole.SUPER_ADMIN) return true;

    if (!user.tenantId) {
      throw new ForbiddenException('No tenant context found');
    }

    // Attach tenantId to request for easy access in repositories
    request.tenantId = user.tenantId;
    return true;
  }
}
