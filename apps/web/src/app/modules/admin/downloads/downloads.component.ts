import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClientsApiService } from '../../../core/services/clients-api.service';

@Component({
  selector: 'app-downloads',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './downloads.component.html',
  styleUrl: './downloads.component.scss',
})
export class DownloadsComponent {
  private readonly clientsApi = inject(ClientsApiService);

  exportClients(): void {
    this.clientsApi.exportCsv({}).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'clientes.csv';
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}
