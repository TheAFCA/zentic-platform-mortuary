import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  SuperAdminDashboard,
  SuperAdminDashboardApiService,
} from '../../../core/services/super-admin-dashboard-api.service';
import { StatCardComponent } from '../../../shared/molecules/stat-card/stat-card.component';
import { FeedbackBannerComponent } from '../../../shared/molecules/feedback-banner/feedback-banner.component';
import { getErrorMessage } from '../../../core/utils/error-message';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, StatCardComponent, FeedbackBannerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class SuperAdminDashboardComponent implements OnInit {
  private readonly dashboardApi = inject(SuperAdminDashboardApiService);

  readonly loading = signal(true);
  readonly dashboard = signal<SuperAdminDashboard | null>(null);
  readonly loadError = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.dashboardApi.get().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(error, 'No se pudo cargar el dashboard global'));
      },
    });
  }
}
