import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StreamingApiService, StreamingEvent } from '../../../core/services/streaming-api.service';
import { EventStatus } from '@zentic/shared-types';
import { getErrorMessage } from '../../../core/utils/error-message';

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En vivo',
  PAUSED: 'Pausado',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
  INTERRUPTED: 'Interrumpido',
};

const STATUS_ICONS: Record<string, string> = {
  SCHEDULED: 'schedule',
  LIVE: 'stream',
  PAUSED: 'pause_circle',
  FINISHED: 'check_circle',
  CANCELLED: 'cancel',
  INTERRUPTED: 'error_outline',
};

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  styles: [
    `
      :host {
        display: block;
      }

      .events-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .events-header__info {
        display: grid;
        gap: 0.25rem;
      }
      .events-header__eyebrow {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #6b7280;
      }
      .events-header__title {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #1f2937;
      }

      .events-tabs {
        display: flex;
        gap: 0.25rem;
        margin-bottom: 1.5rem;
        padding: 0.25rem;
        background: #f3f4f6;
        border-radius: 0.85rem;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .events-tab {
        flex-shrink: 0;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.65rem;
        background: transparent;
        color: #6b7280;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: all 150ms ease;
      }

      .events-tab:hover {
        color: #1f2937;
        background: rgba(255, 255, 255, 0.6);
      }
      .events-tab--active {
        background: #fff;
        color: #0f5e59;
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .events-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
        gap: 1rem;
      }

      .event-card {
        display: block;
        border-radius: 1rem;
        background: #fff;
        border: 1px solid #e7e9ee;
        border-left: 3px solid #e7e9ee;
        padding: 1.25rem;
        transition: all 200ms ease;
        text-decoration: none;
        position: relative;
      }

      .event-card:hover {
        box-shadow: 0 8px 24px rgba(17, 24, 39, 0.08);
        border-color: #d1d5db;
        transform: translateY(-1px);
      }

      .event-card--SCHEDULED {
        border-left-color: #3b82f6;
      }
      .event-card--LIVE {
        border-left-color: #16a34a;
      }
      .event-card--PAUSED {
        border-left-color: #d97706;
      }
      .event-card--FINISHED {
        border-left-color: #6b7280;
      }
      .event-card--CANCELLED {
        border-left-color: #dc2626;
      }
      .event-card--INTERRUPTED {
        border-left-color: #ea580c;
      }

      .event-card__top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .event-card__title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
        line-height: 1.4;
      }

      .event-card__badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 600;
        white-space: nowrap;
        flex-shrink: 0;
        background: #f3f4f6;
        color: #4b5563;
      }

      .event-card__badge mat-icon {
        font-size: 0.85rem;
        width: 0.85rem;
        height: 0.85rem;
      }

      .event-card__badge--SCHEDULED {
        background: #eff6ff;
        color: #1d4ed8;
      }
      .event-card__badge--LIVE {
        background: #f0fdf4;
        color: #15803d;
      }
      .event-card__badge--PAUSED {
        background: #fffbeb;
        color: #b45309;
      }
      .event-card__badge--FINISHED {
        background: #f9fafb;
        color: #4b5563;
      }
      .event-card__badge--CANCELLED {
        background: #fef2f2;
        color: #b91c1c;
      }
      .event-card__badge--INTERRUPTED {
        background: #fff7ed;
        color: #c2410c;
      }

      .event-card__deceased {
        margin: 0 0 0.35rem;
        font-size: 0.88rem;
        color: #4b5563;
      }
      .event-card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        font-size: 0.8rem;
        color: #6b7280;
      }
      .event-card__meta-item {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }
      .event-card__meta-item mat-icon {
        font-size: 0.95rem;
        width: 0.95rem;
        height: 0.95rem;
        color: #9ca3af;
      }

      .event-card__stats {
        display: flex;
        gap: 1rem;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid #f3f4f6;
      }

      .event-card__stat {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.8rem;
        color: #6b7280;
      }

      .event-card__stat mat-icon {
        font-size: 0.95rem;
        width: 0.95rem;
        height: 0.95rem;
        color: #9ca3af;
      }

      .events-empty {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        text-align: center;
        color: #6b7280;
      }

      .events-empty mat-icon {
        font-size: 3rem;
        width: 3rem;
        height: 3rem;
        margin-bottom: 1rem;
        color: #d1d5db;
      }
      .events-empty h3 {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
        font-weight: 600;
        color: #1f2937;
      }
      .events-empty p {
        margin: 0 0 1.25rem;
        font-size: 0.9rem;
      }

      .loading-skeleton {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
        gap: 1rem;
      }
      .skeleton-card {
        border-radius: 1rem;
        background: #fff;
        border: 1px solid #e7e9ee;
        padding: 1.25rem;
      }
      .skeleton-line {
        height: 0.85rem;
        background: #f3f4f6;
        border-radius: 0.25rem;
        margin-bottom: 0.75rem;
        animation: pulse 1.5s ease-in-out infinite;
      }
      .skeleton-line--short {
        width: 60%;
      }
      .skeleton-line--medium {
        width: 80%;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        border-radius: 0.85rem;
        background: #fef2f2;
        color: #991b1b;
        font-size: 0.9rem;
        margin-bottom: 1rem;
      }

      .error-banner mat-icon {
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
        flex-shrink: 0;
      }
    `,
  ],
  template: `
    <div>
      <div class="events-header">
        <div class="events-header__info">
          <p class="events-header__eyebrow">Transmisiones</p>
          <h1 class="events-header__title">Eventos de Streaming</h1>
        </div>
        <a mat-raised-button color="primary" routerLink="/admin/streaming/new">
          <mat-icon>add</mat-icon>
          Nuevo Evento
        </a>
      </div>

      @if (error()) {
        <div class="error-banner" role="alert">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
        </div>
      }

      @if (loading()) {
        <div class="loading-skeleton">
          @for (_ of [1, 2, 3]; track _) {
            <div class="skeleton-card">
              <div class="skeleton-line skeleton-line--short"></div>
              <div class="skeleton-line skeleton-line--medium"></div>
              <div class="skeleton-line" style="width:40%"></div>
            </div>
          }
        </div>
      } @else {
        <div class="events-tabs" role="tablist">
          @for (tab of tabs; track tab.key) {
            <button
              class="events-tab"
              [class.events-tab--active]="activeTab() === tab.key"
              (click)="activeTab.set(tab.key)"
              role="tab"
              [attr.aria-selected]="activeTab() === tab.key"
            >
              {{ tab.label }} ({{ tab.count }})
            </button>
          }
        </div>

        <div class="events-grid">
          @for (event of filteredEvents(); track event.id) {
            <a
              [routerLink]="['/admin/streaming', event.id]"
              class="event-card"
              [class]="'event-card--' + event.status"
            >
              <div class="event-card__top">
                <h3 class="event-card__title">{{ event.title }}</h3>
                <span class="event-card__badge" [class]="'event-card__badge--' + event.status">
                  <mat-icon>{{ statusIcon(event.status) }}</mat-icon>
                  {{ statusLabel(event.status) }}
                </span>
              </div>
              @if (event.deceased) {
                <p class="event-card__deceased">
                  {{ event.deceased.firstName }} {{ event.deceased.lastName }}
                </p>
              }
              <div class="event-card__meta">
                <span class="event-card__meta-item">
                  <mat-icon>calendar_today</mat-icon>
                  {{ event.scheduledAt | date: 'dd/MM/yyyy HH:mm' }}
                </span>
                @if (event.room) {
                  <span class="event-card__meta-item">
                    <mat-icon>location_on</mat-icon>
                    {{ event.room.name }}
                  </span>
                }
              </div>
              <div class="event-card__stats">
                <span class="event-card__stat">
                  <mat-icon>forum</mat-icon>
                  {{ event._count?.messages ?? 0 }}
                </span>
                <span class="event-card__stat">
                  <mat-icon>visibility</mat-icon>
                  {{ event.viewerCount }}
                </span>
              </div>
            </a>
          } @empty {
            <div class="events-empty">
              <mat-icon>live_tv</mat-icon>
              <h3>No hay eventos {{ activeTabLabel().toLowerCase() }}</h3>
              <p>Crea tu primer evento de streaming para comenzar a transmitir.</p>
              <a mat-raised-button color="primary" routerLink="/admin/streaming/new">
                <mat-icon>add</mat-icon>
                Crear primer evento
              </a>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsListComponent {
  private readonly api = inject(StreamingApiService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly events = signal<StreamingEvent[]>([]);
  readonly activeTab = signal('all');

  readonly tabs = [
    { key: 'all', label: 'Todos', count: 0 },
    { key: 'SCHEDULED', label: 'Próximos', count: 0 },
    { key: 'LIVE', label: 'En vivo', count: 0 },
    { key: 'FINISHED', label: 'Finalizados', count: 0 },
    { key: 'CANCELLED', label: 'Cancelados', count: 0 },
  ];

  constructor() {
    this.loadEvents();
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  statusIcon(status: string): string {
    return STATUS_ICONS[status] ?? 'help_outline';
  }

  activeTabLabel(): string {
    return this.tabs.find((t) => t.key === this.activeTab())?.label ?? '';
  }

  get filteredEvents() {
    const tab = this.activeTab();
    return () => {
      const all = this.events();
      if (tab === 'all') return all;
      return all.filter((e) => e.status === (tab as EventStatus));
    };
  }

  private loadEvents() {
    this.loading.set(true);
    this.error.set('');
    this.api.findAll().subscribe({
      next: (events) => {
        this.events.set(events);
        this.updateCounts(events);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(getErrorMessage(error, 'No se pudieron cargar los eventos'));
        this.loading.set(false);
      },
    });
  }

  private updateCounts(events: StreamingEvent[]) {
    for (const tab of this.tabs) {
      if (tab.key === 'all') {
        tab.count = events.length;
      } else {
        tab.count = events.filter((e) => e.status === (tab.key as EventStatus)).length;
      }
    }
  }
}
