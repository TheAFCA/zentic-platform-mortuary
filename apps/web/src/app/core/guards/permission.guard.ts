import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { UserRole, Permission } from '@zentic/shared-types';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  const user = authState.currentUser();
  if (!user) return router.createUrlTree(['/auth/login']);

  const requiredRole = route.data['role'] as UserRole | undefined;
  if (requiredRole && user.role !== requiredRole) {
    return router.createUrlTree(['/no-autorizado']);
  }

  const requiredPermissions = route.data['permissions'] as Permission[] | undefined;
  if (requiredPermissions?.length) {
    const isAdminRole = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.TENANT_ADMIN;
    const hasPermission =
      isAdminRole || requiredPermissions.some((p) => user.permissions.includes(p));
    if (!hasPermission) return router.createUrlTree(['/no-autorizado']);
  }

  return true;
};
