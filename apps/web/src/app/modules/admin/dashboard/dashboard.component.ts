import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { EMPTY, catchError, interval, startWith, switchMap } from 'rxjs';
import { AdminDashboardMetrics } from '@zentic/shared-types';
import { AdminDashboardApiService } from '../../../core/services/admin-dashboard-api.service';
import { StreamingApiService, StreamingEvent } from '../../../core/services/streaming-api.service';
import { StatCardComponent } from '../../../shared/molecules/stat-card/stat-card.component';
import { FeedbackBannerComponent } from '../../../shared/molecules/feedback-banner/feedback-banner.component';
import { BadgeComponent, BadgeColor } from '../../../shared/atoms/badge/badge.component';
import { InitialsAvatarComponent } from '../../../shared/atoms/initials-avatar/initials-avatar.component';
import { getErrorMessage } from '../../../core/utils/error-message';

const REFRESH_INTERVAL_MS = 60_000;
const UPCOMING_WINDOW_MS = 48 * 60 * 60 * 1000;

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En vivo',
  PAUSED: 'Pausado',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
  INTERRUPTED: 'Interrumpido',
};

const STATUS_COLORS: Record<string, BadgeColor> = {
  SCHEDULED: 'blue',
  LIVE: 'red',
  PAUSED: 'yellow',
  FINISHED: 'green',
  CANCELLED: 'gray',
  INTERRUPTED: 'yellow',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    StatCardComponent,
    FeedbackBannerComponent,
    BadgeComponent,
    InitialsAvatarComponent,
  ],
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
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--candle-ink, #6b7280);
      }

      .dashboard__title {
        margin: 0;
        font-family: var(--font-display, inherit);
        font-weight: 500;
        font-size: 1.9rem;
        letter-spacing: 0;
        color: var(--ink, #1f2937);
      }

      .dashboard__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
        gap: 1rem;
      }

      .dashboard__main {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        gap: 1.5rem;
        align-items: start;
      }

      @container (max-width: 56rem) {
        .dashboard__main {
          grid-template-columns: 1fr;
        }
      }

      .dashboard__column {
        display: grid;
        gap: 1.5rem;
        min-width: 0;
      }

      .panel {
        border-radius: var(--radius-xl, 1rem);
        border: 1px solid var(--border, #e7e9ee);
        background: var(--surface-alt, #fff);
        box-shadow: var(--shadow-lg, 0 12px 32px rgba(17, 24, 39, 0.06));
        overflow: hidden;
      }

      .panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.1rem 1.35rem;
        background: var(--surface, #f9fafb);
        border-bottom: 1px solid var(--border-light, #eef0f3);
      }

      .panel__title {
        margin: 0;
        font-family: var(--font-display, inherit);
        font-weight: 500;
        font-size: 1.2rem;
        color: var(--ink, #1f2937);
      }

      .panel__badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.75rem;
        border-radius: 999px;
        background: var(--brand-primary-light, rgba(15, 94, 89, 0.08));
        color: var(--brand-primary, #0f5e59);
        font-size: 0.78rem;
        font-weight: 700;
      }

      .panel__badge-dot {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 999px;
        background: currentColor;
        animation: dashboard-pulse 2s ease-in-out infinite;
      }

      @keyframes dashboard-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.4;
        }
      }

      .panel__link {
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        color: var(--brand-primary, #0f5e59);
        text-decoration: none;
      }

      .panel__link:hover {
        text-decoration: underline;
      }

      .panel__empty {
        margin: 0;
        padding: 2.5rem 1.35rem;
        text-align: center;
        color: var(--ink-secondary, #6b7280);
        font-size: 0.9rem;
      }

      .today-table {
        width: 100%;
        border-collapse: collapse;
      }

      .today-table thead th {
        text-align: left;
        padding: 0.65rem 1.35rem;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-secondary, #6b7280);
        border-bottom: 1px solid var(--border-light, #eef0f3);
      }

      .today-table tbody tr {
        border-bottom: 1px solid var(--border-light, #eef0f3);
        transition: background-color 150ms ease;
      }

      .today-table tbody tr:last-child {
        border-bottom: 0;
      }

      .today-table tbody tr:hover {
        background: var(--surface, #f9fafb);
      }

      .today-table td {
        padding: 0.85rem 1.35rem;
        vertical-align: middle;
      }

      .today-table__family,
      .today-table__location {
        display: grid;
        gap: 0.15rem;
      }

      .today-table__name {
        font-weight: 600;
        color: var(--ink, #1f2937);
      }

      .today-table__meta {
        font-size: 0.8rem;
        color: var(--ink-secondary, #6b7280);
      }

      .today-table__actions {
        text-align: right;
      }

      .today-table__link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 0.6rem;
        color: var(--ink-secondary, #6b7280);
        transition:
          background-color 150ms ease,
          color 150ms ease;
      }

      .today-table__link:hover {
        background: var(--brand-primary, #0f5e59);
        color: #fff;
      }

      .today-table__link mat-icon {
        font-size: 1.15rem;
        width: 1.15rem;
        height: 1.15rem;
      }

      .upcoming-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
        gap: 0.5rem;
        padding: 0.75rem;
      }

      .upcoming-item {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        padding: 0.75rem;
        border-radius: 0.85rem;
        text-decoration: none;
        color: inherit;
        transition: background-color 150ms ease;
      }

      .upcoming-item:hover {
        background: var(--surface, #f9fafb);
      }

      .upcoming-item__date {
        flex: 0 0 auto;
        width: 3rem;
        height: 3rem;
        border-radius: 0.75rem;
        border: 1px solid var(--border, #e7e9ee);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        line-height: 1.1;
      }

      .upcoming-item__day {
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--ink, #1f2937);
      }

      .upcoming-item__month {
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink-secondary, #6b7280);
      }

      .upcoming-item__info {
        display: grid;
        gap: 0.1rem;
        min-width: 0;
      }

      .upcoming-item__name {
        font-weight: 600;
        color: var(--ink, #1f2937);
      }

      .upcoming-item__meta {
        font-size: 0.82rem;
        color: var(--ink-secondary, #6b7280);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .live-card {
        border-radius: var(--radius-xl, 1rem);
        overflow: hidden;
        background: linear-gradient(160deg, var(--brand-primary, #0f5e59), var(--brand-primary-hover, #0b4c48));
        color: #fff;
        box-shadow: var(--shadow-xl, 0 24px 60px rgba(15, 23, 42, 0.22));
      }

      .live-card__media {
        position: relative;
        height: 11rem;
        background: rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .live-card__media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .live-card__badge {
        position: absolute;
        top: 0.9rem;
        left: 0.9rem;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        background: var(--error, #dc2626);
        color: #fff;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.05em;
      }

      .live-card__dot {
        width: 0.4rem;
        height: 0.4rem;
        border-radius: 999px;
        background: #fff;
        animation: dashboard-pulse 1.4s ease-in-out infinite;
      }

      .live-card__stats {
        position: absolute;
        bottom: 0.9rem;
        left: 0.9rem;
        right: 0.9rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.78rem;
        font-weight: 600;
      }

      .live-card__stat {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.25rem 0.55rem;
        border-radius: 0.5rem;
        background: rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(4px);
      }

      .live-card__stat mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }

      .live-card__body {
        padding: 1.25rem 1.35rem 1.5rem;
        display: grid;
        gap: 0.9rem;
      }

      .live-card__name {
        margin: 0;
        font-family: var(--font-display, inherit);
        font-weight: 500;
        font-size: 1.2rem;
      }

      .live-card__meta {
        margin: 0.2rem 0 0;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.75);
      }

      .live-card__cta {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        padding: 0.7rem 1rem;
        border-radius: 0.75rem;
        background: #fff;
        color: var(--brand-primary, #0f5e59);
        font-weight: 700;
        font-size: 0.9rem;
        text-decoration: none;
        transition: transform 150ms ease;
      }

      .live-card__cta:hover {
        transform: translateY(-1px);
      }

      .live-card--empty {
        background: var(--surface-alt, #fff);
        border: 1px dashed var(--border, #e7e9ee);
        color: var(--ink-secondary, #6b7280);
        display: grid;
        justify-items: center;
        gap: 0.6rem;
        padding: 2.5rem 1.5rem;
        text-align: center;
        box-shadow: none;
      }

      .live-card--empty mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
        color: var(--ink-secondary, #9ca3af);
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
          accent="candle"
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
          accent="candle"
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
          accent="candle"
        />
      </div>

      <div class="dashboard__main">
        <div class="dashboard__column">
          <section class="panel">
            <div class="panel__header">
              <h2 class="panel__title">Hoy en la funeraria</h2>
              <span class="panel__badge" *ngIf="todayLiveCount() > 0">
                <span class="panel__badge-dot"></span>
                {{ todayLiveCount() }} en curso
              </span>
            </div>
            <table class="today-table" *ngIf="todayEvents().length; else todayEmpty">
              <thead>
                <tr>
                  <th>Servicio / Familia</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let event of todayEvents()">
                  <td>
                    <div class="today-table__family">
                      <span class="today-table__name"
                        >{{ event.deceased.firstName }} {{ event.deceased.lastName }}</span
                      >
                      <span class="today-table__meta">{{ event.scheduledAt | date: 'shortTime' }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="today-table__location">
                      <span class="today-table__name">{{ locationLabel(event) }}</span>
                      <span class="today-table__meta" *ngIf="event.room">{{ event.room.name }}</span>
                    </div>
                  </td>
                  <td>
                    <app-badge [color]="statusColor(event.status)">{{ statusLabel(event.status) }}</app-badge>
                  </td>
                  <td class="today-table__actions">
                    <a
                      class="today-table__link"
                      [routerLink]="['/admin/streaming', event.id]"
                      aria-label="Ver servicio"
                    >
                      <mat-icon>chevron_right</mat-icon>
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
            <ng-template #todayEmpty>
              <p class="panel__empty">No hay servicios programados para hoy.</p>
            </ng-template>
          </section>

          <section class="panel">
            <div class="panel__header">
              <h2 class="panel__title">Próximos servicios (48h)</h2>
              <a class="panel__link" routerLink="/admin/streaming">Ver calendario completo</a>
            </div>
            <div class="upcoming-grid" *ngIf="upcomingEvents().length; else upcomingEmpty">
              <a
                class="upcoming-item"
                *ngFor="let event of upcomingEvents()"
                [routerLink]="['/admin/streaming', event.id]"
              >
                <div class="upcoming-item__date">
                  <span class="upcoming-item__day">{{ event.scheduledAt | date: 'd' }}</span>
                  <span class="upcoming-item__month">{{ event.scheduledAt | date: 'MMM' }}</span>
                </div>
                <div class="upcoming-item__info">
                  <span class="upcoming-item__name"
                    >{{ event.deceased.firstName }} {{ event.deceased.lastName }}</span
                  >
                  <span class="upcoming-item__meta"
                    >{{ event.scheduledAt | date: 'shortTime' }} • {{ locationLabel(event) }}</span
                  >
                </div>
              </a>
            </div>
            <ng-template #upcomingEmpty>
              <p class="panel__empty">No hay servicios programados en las próximas 48 horas.</p>
            </ng-template>
          </section>
        </div>

        <div class="dashboard__column">
          <section class="live-card" *ngIf="liveEvent() as live; else liveEmpty">
            <div class="live-card__media">
              <img *ngIf="live.deceased.photoUrl" [src]="live.deceased.photoUrl" alt="" />
              <app-initials-avatar
                *ngIf="!live.deceased.photoUrl"
                [firstName]="live.deceased.firstName"
                [lastName]="live.deceased.lastName"
                [sizePx]="72"
              />
              <span class="live-card__badge"><span class="live-card__dot"></span> EN VIVO</span>
              <div class="live-card__stats">
                <span class="live-card__stat"><mat-icon>visibility</mat-icon> {{ live.viewerCount }} viendo</span>
                <span class="live-card__stat" *ngIf="live.hasAccessCode"
                  ><mat-icon>lock</mat-icon> Con código</span
                >
              </div>
            </div>
            <div class="live-card__body">
              <div>
                <h3 class="live-card__name">{{ live.deceased.firstName }} {{ live.deceased.lastName }}</h3>
                <p class="live-card__meta">{{ liveElapsedLabel(live) }} • {{ locationLabel(live) }}</p>
              </div>
              <a class="live-card__cta" [routerLink]="['/admin/streaming', live.id]">
                <mat-icon>videocam</mat-icon>
                Administrar transmisión
              </a>
            </div>
          </section>
          <ng-template #liveEmpty>
            <section class="live-card live-card--empty">
              <mat-icon>videocam_off</mat-icon>
              <p>No hay transmisiones en vivo en este momento.</p>
            </section>
          </ng-template>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardApi = inject(AdminDashboardApiService);
  private readonly streamingApi = inject(StreamingApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly metrics = signal<AdminDashboardMetrics | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  readonly events = signal<StreamingEvent[]>([]);

  readonly todayEvents = computed(() => {
    const now = new Date();
    return this.events()
      .filter((event) => isSameDay(new Date(event.scheduledAt), now))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  });

  readonly todayLiveCount = computed(
    () => this.todayEvents().filter((event) => event.status === 'LIVE').length,
  );

  readonly upcomingEvents = computed(() => {
    const now = Date.now();
    const limit = now + UPCOMING_WINDOW_MS;
    return this.events()
      .filter((event) => {
        const scheduledAt = new Date(event.scheduledAt).getTime();
        return scheduledAt >= now && scheduledAt <= limit && event.status !== 'CANCELLED';
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  });

  readonly liveEvent = computed(() => this.events().find((event) => event.status === 'LIVE') ?? null);

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

    // Datos complementarios (hoy / próximos / en vivo) — degradan en silencio si el
    // rol actual no tiene streaming:read, ya que no son las métricas principales del panel.
    interval(REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.streamingApi.findAll().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (events) => this.events.set(events),
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

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  statusColor(status: string): BadgeColor {
    return STATUS_COLORS[status] ?? 'gray';
  }

  locationLabel(event: StreamingEvent): string {
    return event.room ? event.room.venue.name : 'Streaming privado';
  }

  liveElapsedLabel(event: StreamingEvent): string {
    if (!event.startedAt) return 'En vivo';
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(event.startedAt).getTime()) / 60_000));
    if (minutes < 1) return 'Inició hace instantes';
    if (minutes < 60) return `Inició hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Inició hace ${hours} h`;
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
