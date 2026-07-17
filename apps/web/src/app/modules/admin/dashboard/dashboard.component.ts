import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { EMPTY, catchError, interval, startWith, switchMap } from 'rxjs';
import { AdminDashboardMetrics } from '@zentic/shared-types';
import { AdminDashboardApiService } from '../../../core/services/admin-dashboard-api.service';
import { StatCardComponent } from '../../../shared/molecules/stat-card/stat-card.component';
import { FeedbackBannerComponent } from '../../../shared/molecules/feedback-banner/feedback-banner.component';
import { getErrorMessage } from '../../../core/utils/error-message';

const REFRESH_INTERVAL_MS = 60_000;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, FeedbackBannerComponent],
  styles: [
    `
      .dashboard {
        display: grid;
        gap: 1.5rem;
        max-width: 72rem;
      }

      .dashboard__header {
        display: grid;
        gap: 0.35rem;
      }

      .dashboard__eyebrow {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #6b7280;
      }

      .dashboard__title {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #1f2937;
      }

      .dashboard__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
        gap: 1rem;
      }
    `,
  ],
  template: `
    <div class="dashboard">
      <div class="dashboard__header">
        <p class="dashboard__eyebrow">Panel de control</p>
        <h1 class="dashboard__title">Dashboard</h1>
      </div>
      <app-feedback-banner
        [message]="loadError()"
        title="No pudimos actualizar el dashboard"
        kind="error"
        retryLabel="Reintentar"
        (retry)="refresh()"
      />
      <div class="dashboard__grid">
        <app-stat-card
          label="Eventos activos hoy"
          [value]="loading() ? '—' : (metrics()?.activeEventsToday ?? 0)"
          icon="live_tv"
        />
        <app-stat-card
          label="Obituarios publicados"
          subtitle="este mes"
          [value]="loading() ? '—' : (metrics()?.obituariesPublishedThisMonth ?? 0)"
          icon="article"
        />
        <app-stat-card
          label="Leads este mes"
          [subtitle]="loading() ? '' : leadsDeltaSubtitle()"
          [value]="loading() ? '—' : (metrics()?.leadsThisMonth ?? 0)"
          icon="person_add"
        />
        <app-stat-card
          label="Clientes totales"
          [value]="loading() ? '—' : (metrics()?.totalClients ?? 0)"
          icon="people"
        />
        <app-stat-card
          label="Mensajes pendientes"
          subtitle="de moderación"
          [value]="loading() ? '—' : (metrics()?.pendingMessages ?? 0)"
          icon="mark_chat_unread"
          [accent]="(metrics()?.pendingMessages ?? 0) > 0 ? 'warning' : 'primary'"
        />
        <app-stat-card
          label="Viewers en vivo"
          [value]="loading() ? '—' : (metrics()?.liveViewers ?? 0)"
          icon="visibility"
        />
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardApi = inject(AdminDashboardApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly metrics = signal<AdminDashboardMetrics | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  ngOnInit(): void {
    interval(REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.dashboardApi.get().pipe(
            catchError((error: unknown) => {
              this.loading.set(false);
              this.loadError.set(getErrorMessage(error, 'No se pudo actualizar el dashboard'));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (metrics) => {
          this.metrics.set(metrics);
          this.loading.set(false);
          this.loadError.set('');
        },
      });
  }

  refresh(): void {
    this.loading.set(true);
    this.dashboardApi.get().subscribe({
      next: (metrics) => {
        this.metrics.set(metrics);
        this.loading.set(false);
        this.loadError.set('');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(error, 'No se pudo actualizar el dashboard'));
      },
    });
  }

  leadsDeltaSubtitle(): string {
    const metrics = this.metrics();
    if (!metrics || metrics.leadsDeltaPercent === null) return 'vs. mes anterior: sin datos';
    const sign = metrics.leadsDeltaPercent >= 0 ? '+' : '';
    return `${sign}${metrics.leadsDeltaPercent}% vs. mes anterior`;
  }
}
