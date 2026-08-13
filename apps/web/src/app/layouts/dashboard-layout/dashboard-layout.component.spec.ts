import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthUser, UserRole } from '@zentic/shared-types';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { AuthStateService } from '../../core/services/auth-state.service';
import { PendingMessagesBadgeService } from '../../core/services/pending-messages-badge.service';
import { AdminSettingsApiService } from '../../core/services/admin-settings-api.service';
import { BrandThemeService } from '../../core/services/brand-theme.service';
import { ImpersonationApiService } from '../../core/services/impersonation-api.service';

describe('DashboardLayoutComponent', () => {
  const tenantAdmin: AuthUser = {
    id: 'admin-1',
    email: 'admin@funeraria.com',
    role: UserRole.TENANT_ADMIN,
    tenantId: 'tenant-1',
    permissions: [],
    enabledModules: [],
  };

  let pendingMessagesBadge: { start: ReturnType<typeof vi.fn>; count: () => number };

  function createFixture(user: AuthUser | null) {
    pendingMessagesBadge = { start: vi.fn(), count: () => 0 };

    TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: PendingMessagesBadgeService, useValue: pendingMessagesBadge },
        { provide: AdminSettingsApiService, useValue: { getBrand: () => of({}) } },
        { provide: BrandThemeService, useValue: { apply: vi.fn() } },
        { provide: ImpersonationApiService, useValue: {} },
      ],
    });

    const authState = TestBed.inject(AuthStateService);
    authState.setUser(user);

    const fixture = TestBed.createComponent(DashboardLayoutComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('starts the pending-messages badge polling when tribute_book is enabled', () => {
    createFixture({ ...tenantAdmin, enabledModules: ['tribute_book'] });

    expect(pendingMessagesBadge.start).toHaveBeenCalledOnce();
  });

  it('does NOT start the polling when tribute_book is disabled for the tenant', () => {
    createFixture({ ...tenantAdmin, enabledModules: [] });

    expect(pendingMessagesBadge.start).not.toHaveBeenCalled();
  });

  it('does NOT start the polling for a super admin without tenant context', () => {
    createFixture({
      id: 'super-1',
      email: 'super@zentic.pro',
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      permissions: [],
      enabledModules: [],
    });

    expect(pendingMessagesBadge.start).not.toHaveBeenCalled();
  });
});
