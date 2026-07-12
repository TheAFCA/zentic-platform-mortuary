import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  SuperAdminDashboard,
  SuperAdminDashboardApiService,
} from '../../../core/services/super-admin-dashboard-api.service';
import { StatCardComponent } from '../../../shared/molecules/stat-card/stat-card.component';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, StatCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class SuperAdminDashboardComponent implements OnInit {
  private readonly dashboardApi = inject(SuperAdminDashboardApiService);

  readonly loading = signal(true);
  readonly dashboard = signal<SuperAdminDashboard | null>(null);

  ngOnInit(): void {
    this.dashboardApi.get().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
