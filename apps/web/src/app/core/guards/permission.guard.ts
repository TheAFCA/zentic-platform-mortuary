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
    return router.createUrlTree(['/admin/dashboard']);
  }

  const requiredPermissions = route.data['permissions'] as Permission[] | undefined;
  if (requiredPermissions?.length) {
    const hasPermission = requiredPermissions.some((p) => user.permissions.includes(p));
    if (!hasPermission) return router.createUrlTree(['/admin/dashboard']);
  }

  return true;
};
