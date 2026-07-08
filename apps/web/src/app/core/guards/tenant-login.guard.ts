import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

const reservedHosts = new Set(['localhost', 'super-admin', 'admin', 'www']);

const isTenantHost = (hostname: string) => {
  const [slug] = hostname.split('.');
  return Boolean(slug) && !reservedHosts.has(slug);
};

export const tenantLoginGuard: CanMatchFn = (): boolean | UrlTree => {
  const router = inject(Router);

  if (typeof window !== 'undefined' && !isTenantHost(window.location.hostname)) {
    return router.createUrlTree(['/super-admin/login']);
  }

  return true;
};
