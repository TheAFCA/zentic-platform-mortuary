import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Tenant, TenantPlan, TenantStatus } from '@zentic/shared-types';
import { TenantsComponent } from './tenants.component';
import { TenantsApiService } from '../../../core/services/tenants-api.service';
import { ImpersonationApiService } from '../../../core/services/impersonation-api.service';

describe('TenantsComponent', () => {
  const tenants: Tenant[] = [
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
      enabledModules: ['obituaries', 'streaming'],
    },
  ];

  function createFixture() {
    const tenantsApi = {
      list: vi
        .fn()
        .mockReturnValue(of({ data: tenants, total: 1, page: 1, limit: 100, totalPages: 1 })),
      update: vi.fn().mockReturnValue(of(tenants[0])),
      setModules: vi.fn().mockReturnValue(of(tenants[0])),
      create: vi.fn().mockReturnValue(of({ ...tenants[0], adminUserId: 'admin-1' })),
    };

    TestBed.configureTestingModule({
      imports: [TenantsComponent],
      providers: [
        { provide: TenantsApiService, useValue: tenantsApi },
        { provide: ImpersonationApiService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(TenantsComponent);
    fixture.detectChanges();
    return { fixture, tenantsApi };
  }

  it('renders a row for each tenant returned by the API', () => {
    const { fixture } = createFixture();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="data-row"]');
    expect(rows.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Funeraria Demo');
  });

  it('opens the create form with no editing tenant when "Nuevo Tenant" is clicked', () => {
    const { fixture } = createFixture();

    fixture.componentInstance.openCreate();
    fixture.detectChanges();

    expect(fixture.componentInstance.showForm()).toBe(true);
    expect(fixture.componentInstance.editingTenant()).toBeNull();
    expect(fixture.componentInstance.editingFormValue()).toBeNull();
  });

  it('asks for suspend confirmation with the target tenant', () => {
    const { fixture } = createFixture();

    fixture.componentInstance.askSuspend(tenants[0]);

    expect(fixture.componentInstance.confirmAction()).toBe('suspend');
    expect(fixture.componentInstance.confirmTarget()?.id).toBe('t1');
  });

  it('opens the edit form with a stable form value derived once from the tenant (no per-CD-cycle recompute)', () => {
    const { fixture } = createFixture();

    fixture.componentInstance.openEdit(tenants[0]);
    fixture.detectChanges();
    const firstValue = fixture.componentInstance.editingFormValue();
    fixture.detectChanges();
    const secondValue = fixture.componentInstance.editingFormValue();

    expect(firstValue).toEqual({
      name: 'Funeraria Demo',
      slug: 'demo-funeraria',
      country: 'Colombia',
      adminEmail: '',
      plan: TenantPlan.PRO,
      enabledModules: ['obituaries', 'streaming'],
    });
    // Misma referencia entre ciclos de detección de cambios — si esto regresara a un objeto
    // recalculado en el template en cada CD, este assert fallaría.
    expect(secondValue).toBe(firstValue);
  });

  it('onSave for an existing tenant updates the base fields, then sets modules', () => {
    const { fixture, tenantsApi } = createFixture();
    fixture.componentInstance.openEdit(tenants[0]);

    fixture.componentInstance.onSave({
      name: 'Funeraria Demo Editada',
      slug: 'demo-funeraria',
      country: 'Colombia',
      adminEmail: '',
      plan: TenantPlan.PRO,
      enabledModules: ['leads', 'venues'],
    });

    expect(tenantsApi.update).toHaveBeenCalledWith('t1', {
      name: 'Funeraria Demo Editada',
      country: 'Colombia',
      plan: TenantPlan.PRO,
    });
    expect(tenantsApi.setModules).toHaveBeenCalledWith('t1', ['leads', 'venues']);
  });

  it('onSave for a new tenant sends enabledModules in the create payload', () => {
    const { fixture, tenantsApi } = createFixture();
    fixture.componentInstance.openCreate();

    fixture.componentInstance.onSave({
      name: 'Parque Cementerio',
      slug: 'parque-cementerio',
      country: 'Colombia',
      adminEmail: 'admin@parque-cementerio.com',
      plan: TenantPlan.BASIC,
      enabledModules: ['obituaries', 'streaming', 'tribute_book', 'downloads'],
    });

    expect(tenantsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        enabledModules: ['obituaries', 'streaming', 'tribute_book', 'downloads'],
      }),
    );
    expect(tenantsApi.setModules).not.toHaveBeenCalled();
  });
});
