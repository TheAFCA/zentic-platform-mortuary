import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TenantPlan, TenantStatus } from '@zentic/shared-types';
import { TenantsComponent } from './tenants.component';
import { TenantsApiService } from '../../../core/services/tenants-api.service';
import { ImpersonationApiService } from '../../../core/services/impersonation-api.service';

describe('TenantsComponent', () => {
  const tenants = [
    {
      id: 't1',
      slug: 'demo-funeraria',
      name: 'Funeraria Demo',
      country: 'Colombia',
      plan: TenantPlan.PRO,
      status: TenantStatus.ACTIVE,
      suspendedAt: null,
      suspendReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  function createFixture() {
    TestBed.configureTestingModule({
      imports: [TenantsComponent],
      providers: [
        {
          provide: TenantsApiService,
          useValue: {
            list: () => of({ data: tenants, total: 1, page: 1, limit: 100, totalPages: 1 }),
          },
        },
        { provide: ImpersonationApiService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(TenantsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a row for each tenant returned by the API', () => {
    const fixture = createFixture();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="data-row"]');
    expect(rows.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Funeraria Demo');
  });

  it('opens the create form with no editing tenant when "Nuevo Tenant" is clicked', () => {
    const fixture = createFixture();

    fixture.componentInstance.openCreate();
    fixture.detectChanges();

    expect(fixture.componentInstance.showForm()).toBe(true);
    expect(fixture.componentInstance.editingTenant()).toBeNull();
  });

  it('asks for suspend confirmation with the target tenant', () => {
    const fixture = createFixture();

    fixture.componentInstance.askSuspend(tenants[0]);

    expect(fixture.componentInstance.confirmAction()).toBe('suspend');
    expect(fixture.componentInstance.confirmTarget()?.id).toBe('t1');
  });
});
