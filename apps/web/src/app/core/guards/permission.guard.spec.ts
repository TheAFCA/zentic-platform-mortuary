import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { AuthUser, UserRole } from '@zentic/shared-types';
import { permissionGuard } from './permission.guard';
import { AuthStateService } from '../services/auth-state.service';

describe('permissionGuard', () => {
  let authState: AuthStateService;

  function runGuard(data: Record<string, unknown>) {
    const route = { data } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => permissionGuard(route, {} as never));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { createUrlTree: (path: string[]) => ({ path }) } }],
    });
    authState = TestBed.inject(AuthStateService);
  });

  it('redirects to /auth/login when there is no user', () => {
    const result = runGuard({ permissions: ['leads:read'] });

    expect((result as UrlTree & { path: string[] }).path).toEqual(['/auth/login']);
  });

  it('allows SUPER_ADMIN/TENANT_ADMIN through regardless of the permissions array', () => {
    const user: AuthUser = {
      id: 'u1',
      email: 'admin@funeraria.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      permissions: [],
    };
    authState.setUser(user);

    expect(runGuard({ permissions: ['settings:manage'] })).toBe(true);
  });

  it('redirects a non-admin without the required permission to /no-autorizado', () => {
    authState.setUser({
      id: 'u2',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: ['leads:read'],
    });

    const result = runGuard({ permissions: ['settings:manage'] });

    expect((result as UrlTree & { path: string[] }).path).toEqual(['/no-autorizado']);
  });

  it('allows a non-admin with the required permission through', () => {
    authState.setUser({
      id: 'u2',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: ['leads:read'],
    });

    expect(runGuard({ permissions: ['leads:read'] })).toBe(true);
  });

  it('redirects to /no-autorizado on a role mismatch', () => {
    authState.setUser({
      id: 'u4',
      email: 'admin@funeraria.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      permissions: [],
    });

    const result = runGuard({ role: UserRole.SUPER_ADMIN });

    expect((result as UrlTree & { path: string[] }).path).toEqual(['/no-autorizado']);
  });

  it('allows through when the route has no permission/role requirement', () => {
    authState.setUser({
      id: 'u2',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: [],
    });

    expect(runGuard({})).toBe(true);
  });
});
