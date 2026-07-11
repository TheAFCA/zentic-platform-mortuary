import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthUser, UserRole } from '@zentic/shared-types';
import { HasPermissionDirective } from './has-permission.directive';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: ` <button *appHasPermission="'leads:export'" data-testid="export-btn">Exportar</button> `,
})
class HostComponent {}

describe('HasPermissionDirective', () => {
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

  it('removes the element from the DOM when the user lacks the permission', () => {
    authState.setUser({
      id: 'u1',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: ['leads:read'],
    });

    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="export-btn"]')).toBeNull();
  });

  it('renders the element when the user has the permission', () => {
    authState.setUser({
      id: 'u2',
      email: 'op@funeraria.com',
      role: UserRole.OPERATOR,
      tenantId: 'tenant-1',
      permissions: ['leads:export'],
    });

    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="export-btn"]')).not.toBeNull();
  });

  it('renders the element for SUPER_ADMIN/TENANT_ADMIN even without the permission granted', () => {
    const admin: AuthUser = {
      id: 'u3',
      email: 'admin@funeraria.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      permissions: [],
    };
    authState.setUser(admin);

    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="export-btn"]')).not.toBeNull();
  });
});
