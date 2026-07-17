import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClientsApiService } from '../../../core/services/clients-api.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-downloads',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './downloads.component.html',
  styleUrl: './downloads.component.scss',
})
export class DownloadsComponent {
  private readonly clientsApi = inject(ClientsApiService);
  private readonly notifications = inject(NotificationService);
  readonly exporting = signal(false);

  exportClients(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.clientsApi.exportCsv({}).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'clientes.csv';
        link.click();
        URL.revokeObjectURL(url);
        this.notifications.success('Archivo de clientes descargado');
      },
      error: (error: unknown) => {
        this.exporting.set(false);
        this.notifications.apiError(error, 'No se pudo exportar el archivo de clientes');
      },
    });
  }
}
