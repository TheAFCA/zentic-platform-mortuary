import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthUser, UserRole } from '@zentic/shared-types';
import { UsersComponent } from './users.component';
import { AdminUsersApiService } from '../../../core/services/admin-users-api.service';
import { PermissionsApiService } from '../../../core/services/permissions-api.service';
import { AuthStateService } from '../../../core/services/auth-state.service';

describe('UsersComponent', () => {
  const users = [
    { id: 'u1', email: 'carlos@funeraria.com', role: 'OPERATOR', createdAt: '', lockedUntil: null },
    { id: 'u2', email: 'maria@funeraria.com', role: 'VIEWER', createdAt: '', lockedUntil: null },
  ];

  function createFixture() {
    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        {
          provide: AdminUsersApiService,
          useValue: { getUsers: () => of(users), createUser: () => of({}) },
        },
        {
          provide: PermissionsApiService,
          useValue: { getUserPermissions: () => of({ permissions: [] }) },
        },
      ],
    });
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a row for each user returned by the API', () => {
    const fixture = createFixture();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="user-row"]');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('carlos@funeraria.com');
  });

  it('hides "Nuevo usuario" when the current user lacks users:manage', () => {
    const fixture = createFixture();
    const authState = TestBed.inject(AuthStateService);
    const viewerUser: AuthUser = {
      id: 'viewer',
      email: 'viewer@funeraria.com',
      role: UserRole.VIEWER,
      tenantId: 'tenant-1',
      permissions: ['users:read'],
    };
    authState.setUser(viewerUser);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).map(
      (el: unknown) => (el as HTMLElement).textContent?.trim(),
    );
    expect(buttons.some((text) => text?.includes('Nuevo usuario'))).toBe(false);
  });

  it('shows "Nuevo usuario" for a TENANT_ADMIN', () => {
    const fixture = createFixture();
    const authState = TestBed.inject(AuthStateService);
    authState.setUser({
      id: 'admin-1',
      email: 'admin@funeraria.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      permissions: [],
    });
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).map(
      (el: unknown) => (el as HTMLElement).textContent?.trim(),
    );
    expect(buttons.some((text) => text?.includes('Nuevo usuario'))).toBe(true);
  });
});
