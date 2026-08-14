import { HttpInterceptorFn } from '@angular/common/http';

const reservedHosts = new Set(['localhost', 'super-admin', 'admin', 'www']);

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_CHARS_PATTERN = /^[0-9a-fA-F:]+$/;

/** location.hostname para IPv6 no trae corchetes (ej. "::1"), por eso se detecta por ':' + solo hex. */
const isIpAddress = (host: string): boolean =>
  IPV4_PATTERN.test(host) || (host.includes(':') && IPV6_CHARS_PATTERN.test(host));

const getTenantSlug = () => {
  const host = window.location.hostname;

  // Acceso por IP directa (ej. pruebas sin dominio todavía) — "169.58.175.212".split('.')[0]
  // daría "169" y lo trataría como slug de tenant real, rompiendo cualquier llamada a la API.
  if (isIpAddress(host)) {
    return null;
  }

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
