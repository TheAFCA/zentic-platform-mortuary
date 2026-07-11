import { TestBed } from '@angular/core/testing';
import { AuthUser, UserRole } from '@zentic/shared-types';
import { AuthStateService } from './auth-state.service';

describe('AuthStateService', () => {
  let service: AuthStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthStateService);
  });

  it('hasPermission returns false when no user is set', () => {
    expect(service.hasPermission('leads:read')).toBe(false);
  });

  it('hasPermission bypasses the check for SUPER_ADMIN regardless of the permissions array', () => {
    const user: AuthUser = {
      id: 'u1',
      email: 'super@zentic.pro',
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      permissions: [],
    };
    service.setUser(user);

    expect(service.hasPermission('settings:manage')).toBe(true);
  });

  it('hasPermission bypasses the check for TENANT_ADMIN regardless of the permissions array', () => {
    const user: AuthUser = {
      id: 'u2',
      email: 'admin@funeraria.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      permissions: [],
    };
    service.setUser(user);

    expect(service.hasPermission('users:manage')).toBe(true);
  });

  it('hasPermission checks membership for OPERATOR/VIEWER', () => {
    const user: AuthUser = {
      id: 'u3',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: ['leads:read'],
    };
    service.setUser(user);

    expect(service.hasPermission('leads:read')).toBe(true);
    expect(service.hasPermission('leads:export')).toBe(false);
  });

  it('clear() removes the current user', () => {
    service.setUser({
      id: 'u3',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: ['leads:read'],
    });

    service.clear();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
