import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Tenant, TenantStatus, TENANT_MODULE_KEYS } from '@zentic/shared-types';
import { TenantsApiService } from '../../../core/services/tenants-api.service';
import { ImpersonationApiService } from '../../../core/services/impersonation-api.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/organisms/data-table/data-table.component';
import { ConfirmDialogComponent } from '../../../shared/organisms/confirm-dialog/confirm-dialog.component';
import { BadgeColor, BadgeComponent } from '../../../shared/atoms/badge/badge.component';
import { TenantFormComponent, TenantFormValue } from './tenant-form/tenant-form.component';
import { NotificationService } from '../../../core/services/notification.service';
import { getErrorMessage } from '../../../core/utils/error-message';

type ConfirmAction = 'suspend' | 'reactivate' | 'delete' | 'impersonate';

const RESERVED_HOST_LABELS = new Set(['localhost', 'super-admin', 'admin', 'www']);

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    DataTableComponent,
    ConfirmDialogComponent,
    BadgeComponent,
    TenantFormComponent,
  ],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.scss',
})
export class TenantsComponent implements OnInit {
  private readonly tenantsApi = inject(TenantsApiService);
  private readonly impersonationApi = inject(ImpersonationApiService);
  private readonly notifications = inject(NotificationService);

  readonly tenants = signal<Tenant[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editingTenant = signal<Tenant | null>(null);
  readonly editingFormValue = signal<TenantFormValue | null>(null);
  readonly formError = signal('');

  readonly confirmAction = signal<ConfirmAction | null>(null);
  readonly confirmTarget = signal<Tenant | null>(null);
  readonly confirmReason = signal('');
  readonly confirmError = signal('');
  readonly actionLoading = signal(false);

  readonly columns: DataTableColumn<Tenant>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'slug', label: 'Slug' },
    { key: 'country', label: 'País', format: (value) => (value as string) || '—' },
    { key: 'plan', label: 'Plan' },
    {
      key: 'createdAt',
      label: 'Creado',
      format: (value) => new Date(value as string).toLocaleDateString(),
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.tenantsApi.list({ page: 1, limit: 100 }).subscribe({
      next: (result) => {
        this.tenants.set(result.data);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(error, 'No se pudieron cargar los tenants'));
      },
    });
  }

  statusBadgeColor(status: TenantStatus): BadgeColor {
    switch (status) {
      case TenantStatus.ACTIVE:
        return 'green';
      case TenantStatus.SUSPENDED:
        return 'red';
      case TenantStatus.TRIAL:
        return 'blue';
      default:
        return 'gray';
    }
  }

  openCreate(): void {
    this.formError.set('');
    this.editingTenant.set(null);
    this.editingFormValue.set(null);
    this.showForm.set(true);
  }

  openEdit(tenant: Tenant): void {
    this.formError.set('');
    this.editingTenant.set(tenant);
    this.editingFormValue.set({
      name: tenant.name,
      slug: tenant.slug,
      country: tenant.country || '',
      adminEmail: '',
      plan: tenant.plan,
      enabledModules: tenant.enabledModules,
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  onSave(value: TenantFormValue): void {
    if (this.saving()) return;
    const editing = this.editingTenant();
    this.formError.set('');
    this.saving.set(true);

    const onSuccess = () => {
      this.saving.set(false);
      this.showForm.set(false);
      this.notifications.success(editing ? 'Tenant actualizado' : 'Tenant creado');
      this.load();
    };
    const onError = (error: unknown) => {
      this.saving.set(false);
      this.formError.set(getErrorMessage(error, 'No se pudo guardar el tenant'));
    };

    if (editing) {
      this.tenantsApi
        .update(editing.id, { name: value.name, country: value.country, plan: value.plan })
        .subscribe({
          next: () => {
            this.tenantsApi.setModules(editing.id, value.enabledModules).subscribe({
              next: onSuccess,
              error: onError,
            });
          },
          error: onError,
        });
    } else {
      this.tenantsApi.create(value).subscribe({ next: onSuccess, error: onError });
    }
  }

  askSuspend(tenant: Tenant): void {
    this.confirmTarget.set(tenant);
    this.confirmAction.set('suspend');
    this.confirmReason.set('');
    this.confirmError.set('');
  }

  askReactivate(tenant: Tenant): void {
    this.confirmTarget.set(tenant);
    this.confirmAction.set('reactivate');
    this.confirmError.set('');
  }

  askDelete(tenant: Tenant): void {
    this.confirmTarget.set(tenant);
    this.confirmAction.set('delete');
    this.confirmError.set('');
  }

  askImpersonate(tenant: Tenant): void {
    this.confirmTarget.set(tenant);
    this.confirmAction.set('impersonate');
    this.confirmReason.set('');
    this.confirmError.set('');
  }

  cancelConfirm(): void {
    this.confirmAction.set(null);
    this.confirmTarget.set(null);
  }

  confirmDialogTitle(): string {
    switch (this.confirmAction()) {
      case 'suspend':
        return 'Suspender tenant';
      case 'reactivate':
        return 'Reactivar tenant';
      case 'delete':
        return 'Eliminar tenant';
      case 'impersonate':
        return 'Acceder como Admin';
      default:
        return '';
    }
  }

  confirmDialogMessage(): string {
    const tenant = this.confirmTarget();
    if (!tenant) return '';
    switch (this.confirmAction()) {
      case 'suspend':
        return `Los usuarios de "${tenant.name}" no podrán iniciar sesión mientras esté suspendido.`;
      case 'reactivate':
        return `"${tenant.name}" volverá a estar activo y sus usuarios podrán iniciar sesión.`;
      case 'delete':
        return `Esta acción marcará "${tenant.name}" como eliminado (soft delete). No se puede deshacer desde este panel.`;
      case 'impersonate':
        return `Vas a acceder al panel de "${tenant.name}" como su Tenant Admin. Quedará registrado en auditoría.`;
      default:
        return '';
    }
  }

  isDangerAction(): boolean {
    return this.confirmAction() === 'delete';
  }

  showReasonInput(): boolean {
    const action = this.confirmAction();
    return action === 'suspend' || action === 'impersonate';
  }

  onConfirm(): void {
    if (this.actionLoading()) return;
    const tenant = this.confirmTarget();
    const action = this.confirmAction();
    if (!tenant || !action) return;

    this.confirmError.set('');
    this.actionLoading.set(true);

    switch (action) {
      case 'suspend':
        this.tenantsApi.suspend(tenant.id, this.confirmReason() || undefined).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.cancelConfirm();
            this.notifications.success('Tenant suspendido');
            this.load();
          },
          error: (error: unknown) => {
            this.actionLoading.set(false);
            this.confirmError.set(getErrorMessage(error, 'No se pudo suspender el tenant'));
          },
        });
        break;
      case 'reactivate':
        this.tenantsApi.reactivate(tenant.id).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.cancelConfirm();
            this.notifications.success('Tenant reactivado');
            this.load();
          },
          error: (error: unknown) => {
            this.actionLoading.set(false);
            this.confirmError.set(getErrorMessage(error, 'No se pudo reactivar el tenant'));
          },
        });
        break;
      case 'delete':
        this.tenantsApi.delete(tenant.id).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.cancelConfirm();
            this.notifications.success('Tenant eliminado');
            this.load();
          },
          error: (error: unknown) => {
            this.actionLoading.set(false);
            this.confirmError.set(getErrorMessage(error, 'No se pudo eliminar el tenant'));
          },
        });
        break;
      case 'impersonate':
        this.impersonationApi
          .start(tenant.id, this.confirmReason() || 'Soporte técnico')
          .subscribe({
            next: (session) => {
              this.actionLoading.set(false);
              this.cancelConfirm();
              window.open(this.buildImpersonateUrl(session), '_blank');
            },
            error: (error: unknown) => {
              this.actionLoading.set(false);
              this.confirmError.set(getErrorMessage(error, 'No se pudo iniciar la impersonación'));
            },
          });
        break;
    }
  }

  private buildImpersonateUrl(session: {
    accessToken: string;
    expiresAt: string;
    tenantSlug: string;
    tenantName: string;
    impersonationLogId: string;
  }): string {
    const params = new URLSearchParams({
      token: session.accessToken,
      tenantSlug: session.tenantSlug,
      tenantName: session.tenantName,
      expiresAt: session.expiresAt,
      logId: session.impersonationLogId,
    });

    const { protocol, port } = window.location;
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}//${session.tenantSlug}.${this.platformDomain()}${portSuffix}/impersonate?${params.toString()}`;
  }

  private platformDomain(): string {
    const host = window.location.hostname;
    const [firstLabel, ...rest] = host.split('.');
    if (RESERVED_HOST_LABELS.has(firstLabel) && rest.length > 0) {
      return rest.join('.');
    }
    return host;
  }
}
