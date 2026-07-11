import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { StreamingApiService, StreamingEvent } from '../../../core/services/streaming-api.service';
import { EventStatus } from '@zentic/shared-types';

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En vivo',
  PAUSED: 'Pausado',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
  INTERRUPTED: 'Interrumpido',
};

const STATUS_CLASSES: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  LIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  FINISHED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  INTERRUPTED: 'bg-orange-100 text-orange-800',
};

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTabsModule,
  ],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Eventos de Streaming</h1>
        <a mat-raised-button color="primary" routerLink="/admin/streaming/new">
          <mat-icon>add</mat-icon>
          Nuevo Evento
        </a>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="40" />
        </div>
      } @else if (error()) {
        <div class="bg-red-50 text-red-700 p-4 rounded-lg">{{ error() }}</div>
      } @else {
        <nav mat-tab-nav-bar>
          @for (tab of tabs; track tab.key) {
            <a mat-tab-link [active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">
              {{ tab.label }} ({{ tab.count }})
            </a>
          }
        </nav>

        <div class="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          @for (event of filteredEvents(); track event.id) {
            <a
              [routerLink]="['/admin/streaming', event.id]"
              class="block p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between mb-2">
                <h3 class="font-semibold text-gray-900">{{ event.title }}</h3>
                <span
                  class="px-2 py-0.5 text-xs font-medium rounded-full {{
                    statusClass(event.status)
                  }}"
                >
                  {{ statusLabel(event.status) }}
                </span>
              </div>
              @if (event.deceased) {
                <p class="text-sm text-gray-600">
                  {{ event.deceased.firstName }} {{ event.deceased.lastName }}
                </p>
              }
              <p class="text-xs text-gray-500 mt-1">
                {{ event.scheduledAt | date: 'dd/MM/yyyy HH:mm' }}
              </p>
              @if (event.room) {
                <p class="text-xs text-gray-500">
                  {{ event.room.name }} - {{ event.room.venue.name }}
                </p>
              }
              <div class="flex gap-3 mt-2 text-xs text-gray-400">
                <span>💬 {{ event._count?.messages ?? 0 }}</span>
                <span>👁️ {{ event.viewerCount }}</span>
              </div>
            </a>
          } @empty {
            <div class="col-span-full text-center py-12 text-gray-500">
              No hay eventos {{ activeTabLabel().toLowerCase() }}
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

  statusClass(status: string): string {
    return STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-800';
  }

  activeTabLabel(): string {
    return this.tabs.find((t) => t.key === this.activeTab())?.label ?? '';
  }

  get filteredEvents() {
    const tab = this.activeTab();
    return () => {
      const all = this.events();
      if (tab === 'all') return all;
      return all.filter((e) => e.status === tab);
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
      error: (err) => {
        this.error.set(err.message ?? 'Error al cargar eventos');
        this.loading.set(false);
      },
    });
  }

  private updateCounts(events: StreamingEvent[]) {
    for (const tab of this.tabs) {
      if (tab.key === 'all') {
        tab.count = events.length;
      } else {
        tab.count = events.filter((e) => e.status === tab.key).length;
      }
    }
  }
}
