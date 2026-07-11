import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLogEntry } from '@zentic/shared-types';
import {
  AuditLogFilters,
  AuditLogsApiService,
} from '../../../core/services/audit-logs-api.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/organisms/data-table/data-table.component';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss',
})
export class AuditLogsComponent implements OnInit {
  private readonly auditLogsApi = inject(AuditLogsApiService);

  readonly logs = signal<AuditLogEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly exporting = signal(false);

  readonly tenantId = signal('');
  readonly action = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'createdAt',
      label: 'Fecha',
      format: (value) => new Date(value as string).toLocaleString(),
    },
    { key: 'action', label: 'Acción' },
    { key: 'actorId', label: 'Actor' },
    { key: 'role', label: 'Rol' },
    { key: 'tenantId', label: 'Tenant', format: (value) => (value as string) || '—' },
    { key: 'entityType', label: 'Entidad', format: (value) => (value as string) || '—' },
    { key: 'ipAddress', label: 'IP', format: (value) => (value as string) || '—' },
  ];

  ngOnInit(): void {
    this.load();
  }

  private buildFilters(): AuditLogFilters {
    return {
      tenantId: this.tenantId() || undefined,
      action: this.action() || undefined,
      dateFrom: this.dateFrom() ? new Date(this.dateFrom()).toISOString() : undefined,
      dateTo: this.dateTo() ? new Date(this.dateTo()).toISOString() : undefined,
      page: 1,
      limit: 100,
    };
  }

  load(): void {
    this.loading.set(true);
    this.auditLogsApi.list(this.buildFilters()).subscribe({
      next: (result) => {
        this.logs.set(result.data);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilters(): void {
    this.load();
  }

  clearFilters(): void {
    this.tenantId.set('');
    this.action.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.load();
  }

  exportCsv(): void {
    this.exporting.set(true);
    this.auditLogsApi.exportCsv(this.buildFilters()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'audit-logs.csv';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.exporting.set(false),
    });
  }
}
