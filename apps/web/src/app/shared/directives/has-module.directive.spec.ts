import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthUser, UserRole } from '@zentic/shared-types';
import { HasModuleDirective } from './has-module.directive';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  standalone: true,
  imports: [HasModuleDirective],
  template: `
    <a *appHasModule="'leads'" data-testid="leads-link">Leads</a>
    <a *appHasModule="null" data-testid="always-on-link">Dashboard</a>
  `,
})
class HostComponent {}

describe('HasModuleDirective', () => {
  let authState: AuthStateService;

  function createFixture() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    authState = TestBed.inject(AuthStateService);
  });

  it('removes the element when the tenant does not have the module enabled', () => {
    authState.setUser({
      id: 'u1',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: [],
      enabledModules: ['obituaries'],
    });

    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="leads-link"]')).toBeNull();
  });

  it('renders the element when the tenant has the module enabled', () => {
    authState.setUser({
      id: 'u2',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: [],
      enabledModules: ['leads'],
    });

    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="leads-link"]')).not.toBeNull();
  });

  it('renders the element for SUPER_ADMIN even without the module enabled', () => {
    const admin: AuthUser = {
      id: 'u3',
      email: 'super@zentic.pro',
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      permissions: [],
      enabledModules: [],
    };
    authState.setUser(admin);

    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="leads-link"]')).not.toBeNull();
  });

  it('does NOT bypass for TENANT_ADMIN (unlike appHasPermission)', () => {
    authState.setUser({
      id: 'u4',
      email: 'admin@funeraria.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      permissions: [],
      enabledModules: [],
    });

    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="leads-link"]')).toBeNull();
  });

  it('always renders an item with a null module, regardless of enabledModules', () => {
    authState.setUser({
      id: 'u5',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: [],
      enabledModules: [],
    });

    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="always-on-link"]')).not.toBeNull();
  });
});
