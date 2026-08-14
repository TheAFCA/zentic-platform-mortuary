import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { TenantModuleKey } from '@zentic/shared-types';

/**
 * Bloquea la navegación directa por URL a un módulo desactivado para el tenant (Super Admin →
 * control de acceso por tenant). Complementa a permissionGuard, no lo reemplaza — ambos pueden
 * aplicarse a la misma ruta.
 */
export const moduleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  const user = authState.currentUser();
  if (!user) return router.createUrlTree(['/auth/login']);

  const requiredModule = route.data['module'] as TenantModuleKey | undefined;
  if (requiredModule && !authState.hasModule(requiredModule)) {
    return router.createUrlTree(['/no-autorizado']);
  }

  return true;
};
