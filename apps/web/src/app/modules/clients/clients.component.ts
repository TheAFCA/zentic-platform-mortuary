import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Client, ClientStatus } from '@zentic/shared-types';
import { ClientsApiService } from '../../core/services/clients-api.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../shared/organisms/data-table/data-table.component';
import { BadgeColor, BadgeComponent } from '../../shared/atoms/badge/badge.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { ClientFormComponent, ClientFormValue } from './client-form/client-form.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    DataTableComponent,
    BadgeComponent,
    HasPermissionDirective,
    ClientFormComponent,
  ],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
})
export class ClientsComponent implements OnInit {
  private readonly clientsApi = inject(ClientsApiService);

  readonly clients = signal<Client[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly search = signal('');

  readonly showForm = signal(false);
  readonly editingClient = signal<Client | null>(null);
  readonly formError = signal('');

  readonly columns: DataTableColumn<Client>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'email', label: 'Email', format: (value) => (value as string) || '—' },
    { key: 'phone', label: 'Teléfono', format: (value) => (value as string) || '—' },
    { key: 'relationship', label: 'Relación', format: (value) => (value as string) || '—' },
    {
      key: 'serviceDate',
      label: 'Fecha de servicio',
      format: (value) => (value ? new Date(value as string).toLocaleDateString() : '—'),
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.clientsApi.list({ page: 1, limit: 100, search: this.search() || undefined }).subscribe({
      next: (result) => {
        this.clients.set(result.data);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.load();
  }

  statusBadgeColor(status: ClientStatus): BadgeColor {
    return status === ClientStatus.ACTIVE ? 'green' : 'gray';
  }

  openCreate(): void {
    this.formError.set('');
    this.editingClient.set(null);
    this.showForm.set(true);
  }

  openEdit(client: Client): void {
    this.formError.set('');
    this.editingClient.set(client);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  editingFormValue(): ClientFormValue | null {
    const client = this.editingClient();
    if (!client) return null;
    return {
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      relationship: client.relationship ?? '',
      notes: client.notes ?? '',
      status: client.status,
      serviceDate: client.serviceDate ? client.serviceDate.slice(0, 10) : '',
    };
  }

  onSave(value: ClientFormValue): void {
    const editing = this.editingClient();
    this.formError.set('');

    const payload = {
      name: value.name,
      email: value.email || undefined,
      phone: value.phone || undefined,
      relationship: value.relationship || undefined,
      notes: value.notes || undefined,
      status: value.status,
      serviceDate: value.serviceDate || undefined,
    };

    const request = editing
      ? this.clientsApi.update(editing.id, payload)
      : this.clientsApi.create(payload);

    request.subscribe({
      next: () => {
        this.showForm.set(false);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(this.extractErrorMessage(error, 'No se pudo guardar el cliente'));
      },
    });
  }

  exportCsv(): void {
    this.clientsApi.exportCsv({ search: this.search() || undefined }).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'clientes.csv';
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? fallback;
  }
}
