import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { interval, startWith, switchMap } from 'rxjs';
import { AdminDashboardMetrics } from '@zentic/shared-types';
import { AdminDashboardApiService } from '../../../core/services/admin-dashboard-api.service';
import { StatCardComponent } from '../../../shared/molecules/stat-card/stat-card.component';

const REFRESH_INTERVAL_MS = 60_000;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardApi = inject(AdminDashboardApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly metrics = signal<AdminDashboardMetrics | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    interval(REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.dashboardApi.get()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (metrics) => {
          this.metrics.set(metrics);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  leadsDeltaSubtitle(): string {
    const metrics = this.metrics();
    if (!metrics || metrics.leadsDeltaPercent === null) return 'vs. mes anterior: sin datos';
    const sign = metrics.leadsDeltaPercent >= 0 ? '+' : '';
    return `${sign}${metrics.leadsDeltaPercent}% vs. mes anterior`;
  }
}
