import { HttpInterceptorFn } from '@angular/common/http';

const reservedHosts = new Set(['localhost', 'super-admin', 'admin', 'www']);

const getTenantSlug = () => {
  const host = window.location.hostname;
  const [slug] = host.split('.');

  if (!slug || reservedHosts.has(slug)) {
    return null;
  }

  return slug;
};

export const tenantContextInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantSlug = getTenantSlug();

  if (!tenantSlug || !req.url.startsWith('/api')) {
    return next(req.clone({ withCredentials: true }));
  }

  return next(
    req.clone({
      withCredentials: true,
      setHeaders: { 'x-tenant-slug': tenantSlug },
    }),
  );
};
