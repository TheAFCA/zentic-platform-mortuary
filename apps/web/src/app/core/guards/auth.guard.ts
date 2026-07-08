import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

export const authGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return true;
  }

  const targetLogin = state.url.startsWith('/super-admin') ? '/super-admin/login' : '/auth/login';

  return router.createUrlTree([targetLogin]);
};
