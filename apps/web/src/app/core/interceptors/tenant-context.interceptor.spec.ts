import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { of } from 'rxjs';
import { tenantContextInterceptor } from './tenant-context.interceptor';

describe('tenantContextInterceptor', () => {
  const originalHostname = window.location.hostname;

  function setHostname(hostname: string) {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hostname },
      writable: true,
      configurable: true,
    });
  }

  function run(req: HttpRequest<unknown>): HttpRequest<unknown> {
    let captured!: HttpRequest<unknown>;
    const next: HttpHandlerFn = (forwarded) => {
      captured = forwarded;
      return of();
    };
    tenantContextInterceptor(req, next).subscribe();
    return captured;
  }

  afterEach(() => {
    setHostname(originalHostname);
  });

  it('adds x-tenant-slug for a real tenant subdomain', () => {
    setHostname('demo-funeraria.zentic.pro');
    const forwarded = run(new HttpRequest('GET', '/api/auth/me'));

    expect(forwarded.headers.get('x-tenant-slug')).toBe('demo-funeraria');
  });

  it('does NOT add x-tenant-slug when accessed via a raw IPv4 address', () => {
    // "169.58.175.212".split('.')[0] === "169" — sin esta guarda se mandaría
    // como si fuera un slug de tenant real y rompería cualquier llamada a la API.
    setHostname('169.58.175.212');
    const forwarded = run(new HttpRequest('GET', '/api/auth/login'));

    expect(forwarded.headers.has('x-tenant-slug')).toBe(false);
  });

  it('does NOT add x-tenant-slug when accessed via a raw IPv6 address', () => {
    setHostname('::1');
    const forwarded = run(new HttpRequest('GET', '/api/auth/login'));

    expect(forwarded.headers.has('x-tenant-slug')).toBe(false);
  });

  it('does NOT add x-tenant-slug for reserved hosts', () => {
    setHostname('admin.zentic.pro');
    const forwarded = run(new HttpRequest('GET', '/api/auth/login'));

    expect(forwarded.headers.has('x-tenant-slug')).toBe(false);
  });

  it('does not touch non-/api requests', () => {
    setHostname('demo-funeraria.zentic.pro');
    const forwarded = run(new HttpRequest('GET', '/assets/logo.png'));

    expect(forwarded.headers.has('x-tenant-slug')).toBe(false);
  });
});
