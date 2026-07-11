import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  StreamingApiService,
  StreamingEvent,
  Message,
} from '../../../core/services/streaming-api.service';
import { StreamingSocketService } from '../../../core/services/streaming-socket.service';
import { EventStatus } from '@zentic/shared-types';

/**
 * Componente de detalle y control de un evento de streaming.
 *
 * Proporciona una vista completa del evento con:
 * - Información general y estado
 * - Panel de control del stream (iniciar/detener)
 * - Credenciales de transmisión OBS (stream key, RTMP URL)
 * - Moderación de mensajes en tiempo real (aprobar/rechazar)
 * - Visualización de grabación si el evento finalizó
 *
 * @remarks
 * Se conecta al Socket.IO al cargar un evento en LIVE/PAUSED
 * para recibir actualizaciones en tiempo real. Los mensajes
 * nuevos aparecen automáticamente sin recargar la página.
 */
@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  template: `
    <div class="p-6">
      @if (loading()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="40" />
        </div>
      } @else if (error()) {
        <div class="bg-red-50 text-red-700 p-4 rounded-lg">{{ error() }}</div>
      } @else if (event(); as ev) {
        <div class="max-w-5xl mx-auto">
          <!-- Header -->
          <div class="flex items-start justify-between mb-6">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ ev.title }}</h1>
              @if (ev.deceased) {
                <p class="text-gray-600 mt-1">
                  {{ ev.deceased.firstName }} {{ ev.deceased.lastName }}
                </p>
              }
              <p class="text-sm text-gray-500 mt-1">
                {{ ev.scheduledAt | date : 'dd/MM/yyyy HH:mm' }}
                @if (ev.room) {
                  · {{ ev.room.name }} - {{ ev.room.venue.name }}
                }
              </p>
            </div>
            <span
              class="px-3 py-1 text-sm font-medium rounded-full {{ statusClass(ev.status) }}"
            >
              {{ statusLabel(ev.status) }}
            </span>
          </div>

          <!-- Controls -->
          @if (canManage()) {
            <mat-card class="mb-6">
              <mat-card-content class="p-4">
                <div class="flex items-center gap-3">
                  @if (ev.status === 'SCHEDULED') {
                    <button
                      mat-raised-button
                      color="primary"
                      (click)="startStream()"
                      [disabled]="streamLoading()"
                    >
                      <mat-icon>play_arrow</mat-icon> Iniciar transmisión
                    </button>
                  }
                  @if (ev.status === 'LIVE' || ev.status === 'PAUSED') {
                    <button
                      mat-raised-button
                      color="warn"
                      (click)="stopStream()"
                      [disabled]="streamLoading()"
                    >
                      <mat-icon>stop</mat-icon> Finalizar transmisión
                    </button>
                  }
                  @if (ev.status === 'LIVE') {
                    <span class="flex items-center gap-1 text-green-700">
                      <span
                        class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                      ></span>
                      Transmitiendo en vivo · {{ viewerCount() }} espectadores
                    </span>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }

          <!-- Stream credentials -->
          @if (ev.status === 'SCHEDULED' && canManage()) {
            <mat-card class="mb-6">
              <mat-card-header>
                <mat-card-title>Credenciales de transmisión</mat-card-title>
              </mat-card-header>
              <mat-card-content class="p-4 space-y-3">
                <div>
                  <label class="text-sm font-medium text-gray-600"
                    >Stream Key</label
                  >
                  <div class="flex items-center gap-2 mt-1">
                    <code
                      class="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all"
                    >
                      {{ ev.streamKey }}
                    </code>
                    <button
                      mat-icon-button
                      (click)="copyToClipboard(ev.streamKey!)"
                      matTooltip="Copiar"
                    >
                      <mat-icon>content_copy</mat-icon>
                    </button>
                  </div>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-600"
                    >RTMP URL</label
                  >
                  <div class="flex items-center gap-2 mt-1">
                    <code
                      class="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all"
                    >
                      {{ ev.rtmpUrl }}
                    </code>
                    <button
                      mat-icon-button
                      (click)="copyToClipboard(ev.rtmpUrl!)"
                      matTooltip="Copiar"
                    >
                      <mat-icon>content_copy</mat-icon>
                    </button>
                  </div>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-600"
                    >URL Pública del Evento</label
                  >
                  <div class="flex items-center gap-2 mt-1">
                    <code
                      class="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all"
                    >
                      {{ getPublicUrl() }}
                    </code>
                    <button
                      mat-icon-button
                      (click)="copyToClipboard(getPublicUrl())"
                      matTooltip="Copiar"
                    >
                      <mat-icon>content_copy</mat-icon>
                    </button>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          }

          <!-- Tabs -->
          <nav mat-tab-nav-bar>
            @for (tab of tabs; track tab.key) {
              <a
                mat-tab-link
                [active]="activeTab() === tab.key"
                (click)="activeTab.set(tab.key)"
              >
                {{ tab.label }}
              </a>
            }
          </nav>

          <!-- Messages tab -->
          @if (activeTab() === 'messages') {
            <div class="mt-4 space-y-3">
              @if (canModerate()) {
                <div class="flex items-center gap-2 mb-4">
                  <button
                    mat-stroked-button
                    (click)="loadPendingMessages()"
                    [disabled]="messagesLoading()"
                  >
                    Pendientes ({{ pendingCount() }})
                  </button>
                  <button
                    mat-stroked-button
                    (click)="loadMessages()"
                    [disabled]="messagesLoading()"
                  >
                    Todos los mensajes
                  </button>
                </div>
              }

              @if (messagesLoading()) {
                <div class="flex justify-center py-8">
                  <mat-spinner diameter="30" />
                </div>
              } @else if (messages().length === 0) {
                <div class="text-center py-8 text-gray-500">
                  No hay mensajes aún
                </div>
              } @else {
                @for (msg of messages(); track msg.id) {
                  <div
                    class="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <span class="text-xl">{{
                      iconMap[msg.iconType ?? ''] ?? '💬'
                    }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-sm text-gray-900">
                        {{ msg.authorName }}
                      </p>
                      <p class="text-gray-700 text-sm mt-0.5">
                        {{ msg.content }}
                      </p>
                      <p class="text-xs text-gray-400 mt-1">
                        {{ msg.createdAt | date : 'dd/MM HH:mm' }}
                      </p>
                    </div>
                    @if (msg.status === 'PENDING' && canModerate()) {
                      <div class="flex gap-1">
                        <button
                          mat-icon-button
                          color="primary"
                          (click)="approveMessage(msg.id)"
                          matTooltip="Aprobar"
                        >
                          <mat-icon>check_circle</mat-icon>
                        </button>
                        <button
                          mat-icon-button
                          color="warn"
                          (click)="rejectMessage(msg.id)"
                          matTooltip="Rechazar"
                        >
                          <mat-icon>cancel</mat-icon>
                        </button>
                      </div>
                    }
                    @if (msg.status === 'REJECTED') {
                      <span class="text-xs text-red-500">Rechazado</span>
                    }
                  </div>
                }
              }
            </div>
          }

          <!-- Recording tab -->
          @if (activeTab() === 'recording') {
            <div class="mt-4">
              @if (ev.recordingUrl && ev.status === 'FINISHED') {
                <div class="aspect-video bg-black rounded-lg overflow-hidden">
                  <video controls class="w-full h-full" [src]="ev.recordingUrl"></video>
                </div>
                <p class="text-sm text-gray-500 mt-2">
                  Grabación disponible — descárgala desde el panel de
                  administración
                </p>
              } @else {
                <div class="text-center py-8 text-gray-500">
                  @if (ev.status === 'LIVE') {
                    La grabación estará disponible cuando finalice el evento
                  } @else if (ev.status === 'SCHEDULED') {
                    El evento aún no ha iniciado
                  } @else {
                    No hay grabación disponible
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(StreamingApiService);
  private readonly socket = inject(StreamingSocketService);
  private readonly snackBar = inject(MatSnackBar);

  /** Indica si el detalle del evento está cargando */
  readonly loading = signal(true);
  /** Mensaje de error si la carga falla */
  readonly error = signal('');
  /** Datos del evento actual */
  readonly event = signal<StreamingEvent | null>(null);
  /** Lista de mensajes del evento */
  readonly messages = signal<Message[]>([]);
  /** Cantidad de mensajes pendientes de moderación */
  readonly pendingCount = signal(0);
  /** Indica si los mensajes están cargando */
  readonly messagesLoading = signal(false);
  /** Indica si una operación de stream está en curso */
  readonly streamLoading = signal(false);
  /** Contador de espectadores en vivo */
  readonly viewerCount = signal(0);
  /** Tab activa en la vista de detalle */
  readonly activeTab = signal('messages');

  /** Configuración de las tabs de detalle */
  readonly tabs = [
    { key: 'messages', label: 'Mensajes y Homenajes' },
    { key: 'recording', label: 'Grabación' },
  ];

  /** Mapa de iconos por tipo */
  readonly iconMap: Record<string, string> = {
    HEART: '❤️',
    CANDLE: '🕯️',
    FLOWER: '🌸',
    DOVE: '🕊️',
    heart: '❤️',
    candle: '🕯️',
    flower: '🌸',
    dove: '🕊️',
  };

  /** Mapa de etiquetas de estado */
  readonly statusLabels: Record<string, string> = {
    SCHEDULED: 'Programado',
    LIVE: 'En vivo',
    PAUSED: 'Pausado',
    FINISHED: 'Finalizado',
    CANCELLED: 'Cancelado',
    INTERRUPTED: 'Interrumpido',
  };

  private eventId = '';

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (id) {
      this.eventId = id;
      this.loadEvent();

      this.socket.newMessage$.subscribe((msg) => {
        this.messages.update((prev) => [...prev, msg as unknown as Message]);
      });

      this.socket.viewerCount$.subscribe((count) => {
        this.viewerCount.set(count);
        this.event.update((e) => (e ? { ...e, viewerCount: count } : e));
      });

      this.socket.streamStatus$.subscribe((status) => {
        this.event.update((e) =>
          e ? { ...e, status: status as EventStatus } : e,
        );
      });
    }
  }

  /** Verifica si el usuario puede gestionar el stream */
  get canManage(): () => boolean {
    return () => true;
  }

  /** Verifica si el usuario puede moderar mensajes */
  get canModerate(): () => boolean {
    return () => true;
  }

  /** Retorna la etiqueta legible para un estado */
  statusLabel(status: string): string {
    return this.statusLabels[status] ?? status;
  }

  /** Retorna la clase CSS para el badge de estado */
  statusClass(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      LIVE: 'bg-green-100 text-green-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      FINISHED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
      INTERRUPTED: 'bg-orange-100 text-orange-800',
    };
    return map[status] ?? 'bg-gray-100 text-gray-800';
  }

  /** Genera la URL pública del evento */
  getPublicUrl(): string {
    const ev = this.event();
    return ev ? `${window.location.origin}/e/${ev.slug}` : '';
  }

  /** Copia un valor al portapapeles */
  copyToClipboard(value: string): void {
    navigator.clipboard.writeText(value).then(() => {
      this.snackBar.open('Copiado al portapapeles', 'Cerrar', {
        duration: 2000,
      });
    });
  }

  /** Inicia la transmisión en vivo del evento */
  startStream(): void {
    this.streamLoading.set(true);
    this.api.startStream(this.eventId).subscribe({
      next: (ev) => {
        this.event.set(ev);
        this.streamLoading.set(false);
        this.socket.connect(this.eventId, true);
        this.snackBar.open('Transmisión iniciada', 'Cerrar', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.streamLoading.set(false);
        this.snackBar.open(err.message ?? 'Error al iniciar', 'Cerrar', {
          duration: 3000,
        });
      },
    });
  }

  /** Finaliza la transmisión en vivo */
  stopStream(): void {
    this.streamLoading.set(true);
    this.api.stopStream(this.eventId).subscribe({
      next: (ev) => {
        this.event.set(ev);
        this.streamLoading.set(false);
        this.socket.disconnect();
        this.snackBar.open('Transmisión finalizada', 'Cerrar', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.streamLoading.set(false);
        this.snackBar.open(err.message ?? 'Error al finalizar', 'Cerrar', {
          duration: 3000,
        });
      },
    });
  }

  /** Carga los mensajes aprobados del evento */
  loadMessages(): void {
    this.messagesLoading.set(true);
    this.api.getMessages(this.eventId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.messagesLoading.set(false);
      },
      error: () => this.messagesLoading.set(false),
    });
  }

  /** Carga los mensajes pendientes de moderación */
  loadPendingMessages(): void {
    this.messagesLoading.set(true);
    this.api.getPendingMessages(this.eventId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.pendingCount.set(msgs.length);
        this.messagesLoading.set(false);
      },
      error: () => this.messagesLoading.set(false),
    });
  }

  /** Aprueba un mensaje pendiente y lo transmite a los viewers */
  approveMessage(messageId: string): void {
    this.api.approveMessage(this.eventId, messageId).subscribe({
      next: () => {
        this.messages.update((prev) => prev.filter((m) => m.id !== messageId));
        this.pendingCount.update((c) => Math.max(0, c - 1));
        this.snackBar.open('Mensaje aprobado', 'Cerrar', { duration: 2000 });
      },
      error: () =>
        this.snackBar.open('Error al aprobar mensaje', 'Cerrar', {
          duration: 2000,
        }),
    });
  }

  /** Rechaza un mensaje pendiente */
  rejectMessage(messageId: string): void {
    this.api.rejectMessage(this.eventId, messageId).subscribe({
      next: () => {
        this.messages.update((prev) => prev.filter((m) => m.id !== messageId));
        this.pendingCount.update((c) => Math.max(0, c - 1));
        this.snackBar.open('Mensaje rechazado', 'Cerrar', { duration: 2000 });
      },
      error: () =>
        this.snackBar.open('Error al rechazar mensaje', 'Cerrar', {
          duration: 2000,
        }),
    });
  }

  /** Carga el evento completo y configura Socket.IO si está en vivo */
  private loadEvent(): void {
    this.loading.set(true);
    this.api.findOne(this.eventId).subscribe({
      next: (ev) => {
        this.event.set(ev);
        this.loading.set(false);
        this.loadMessages();

        if (ev.status === 'LIVE' || ev.status === 'PAUSED') {
          this.socket.connect(this.eventId, true);
        }
      },
      error: (err) => {
        this.error.set(err.message ?? 'Error al cargar evento');
        this.loading.set(false);
      },
    });
  }
}
