import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { UserRole } from '@zentic/shared-types';
import { moduleGuard } from './module.guard';
import { AuthStateService } from '../services/auth-state.service';

describe('moduleGuard', () => {
  let authState: AuthStateService;

  function runGuard(data: Record<string, unknown>) {
    const route = { data } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => moduleGuard(route, {} as never));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { createUrlTree: (path: string[]) => ({ path }) } }],
    });
    authState = TestBed.inject(AuthStateService);
  });

  it('redirects to /auth/login when there is no user', () => {
    const result = runGuard({ module: 'leads' });

    expect((result as UrlTree & { path: string[] }).path).toEqual(['/auth/login']);
  });

  it('redirects to /no-autorizado when the tenant does not have the module enabled', () => {
    authState.setUser({
      id: 'u1',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: [],
      enabledModules: ['obituaries'],
    });

    const result = runGuard({ module: 'leads' });

    expect((result as UrlTree & { path: string[] }).path).toEqual(['/no-autorizado']);
  });

  it('allows through when the tenant has the module enabled', () => {
    authState.setUser({
      id: 'u2',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: [],
      enabledModules: ['leads'],
    });

    expect(runGuard({ module: 'leads' })).toBe(true);
  });

  it('does NOT bypass for TENANT_ADMIN (unlike permissionGuard)', () => {
    authState.setUser({
      id: 'u3',
      email: 'admin@funeraria.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      permissions: [],
      enabledModules: [],
    });

    const result = runGuard({ module: 'leads' });

    expect((result as UrlTree & { path: string[] }).path).toEqual(['/no-autorizado']);
  });

  it('allows SUPER_ADMIN through regardless of enabledModules', () => {
    authState.setUser({
      id: 'u4',
      email: 'super@zentic.pro',
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      permissions: [],
      enabledModules: [],
    });

    expect(runGuard({ module: 'leads' })).toBe(true);
  });

  it('allows through when the route has no module requirement', () => {
    authState.setUser({
      id: 'u5',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: [],
      enabledModules: [],
    });

    expect(runGuard({})).toBe(true);
  });
});
