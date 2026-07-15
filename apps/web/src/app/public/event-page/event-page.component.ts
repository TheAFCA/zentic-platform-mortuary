import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { StreamingApiService, PublicEvent } from '../../core/services/streaming-api.service';
import {
  StreamingSocketService,
  SocketMessage,
} from '../../core/services/streaming-socket.service';
import { EventStatus } from '@zentic/shared-types';

/** Iconos de reacción rápida disponibles */
const REACTION_ICONS = [
  { type: 'heart', icon: '❤️', label: 'Corazón' },
  { type: 'candle', icon: '🕯️', label: 'Vela' },
  { type: 'flower', icon: '🌸', label: 'Flor' },
  { type: 'dove', icon: '🕊️', label: 'Paloma' },
];

/**
 * Página pública de evento de streaming.
 *
 * Accesible sin autenticación en la ruta `/e/:slug`.
 * Proporciona la experiencia completa para familiares y amigos:
 * - Reproductor de video en vivo (o grabación si finalizó)
 * - Información del difunto
 * - Reacciones rápidas con animaciones
 * - Mensajes de homenaje en tiempo real via Socket.IO
 * - Formulario de código de acceso para eventos privados
 * - Botones para compartir (WhatsApp, email, copiar enlace)
 *
 * @remarks
 * Si el evento requiere código de acceso, muestra un formulario
 * inicial antes de revelar el contenido. Al acceder exitosamente,
 * se conecta al Socket.IO para recibir actualizaciones en vivo.
 */
@Component({
  selector: 'app-event-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  template: `
    @if (loading()) {
      <div class="min-h-screen bg-gray-900 flex items-center justify-center">
        <mat-spinner diameter="40" color="accent" />
      </div>
    } @else if (error()) {
      <div class="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div class="text-center">
          <h1 class="text-2xl font-bold mb-2">Evento no encontrado</h1>
          <p class="text-gray-400">{{ error() }}</p>
        </div>
      </div>
    } @else if (evt(); as event) {
      @if (!accessGranted()) {
        <!-- Access code form -->
        <div
          class="min-h-screen flex items-center justify-center p-4"
          [style]="{
            background: event.tenant.brandConfig?.backgroundColor ?? '#f5f5f5',
          }"
        >
          <mat-card class="w-full max-w-md">
            <mat-card-content class="p-6">
              @if (event.tenant.brandConfig?.logoUrl) {
                <img
                  [src]="event.tenant.brandConfig?.logoUrl"
                  class="h-12 mx-auto mb-4"
                  alt="Logo"
                />
              }
              <h2 class="text-xl font-semibold text-center mb-2">
                {{ event.title }}
              </h2>
              <p class="text-gray-600 text-center mb-6">
                Ingresa el código de acceso para ver el evento
              </p>

              <form [formGroup]="accessForm" (ngSubmit)="submitAccessCode()" class="space-y-4">
                <mat-form-field class="w-full">
                  <mat-label>Tu nombre</mat-label>
                  <input matInput formControlName="name" placeholder="Nombre completo" />
                </mat-form-field>

                <mat-form-field class="w-full">
                  <mat-label>Email (opcional)</mat-label>
                  <input
                    matInput
                    type="email"
                    formControlName="email"
                    placeholder="correo@ejemplo.com"
                  />
                </mat-form-field>

                <mat-form-field class="w-full">
                  <mat-label>Código de acceso</mat-label>
                  <input matInput formControlName="code" placeholder="Ej: FAMILIA2026" required />
                  @if (accessForm.get('code')?.invalid && accessForm.get('code')?.touched) {
                    <mat-error>El código es requerido</mat-error>
                  }
                </mat-form-field>

                <button
                  mat-raised-button
                  color="primary"
                  class="w-full"
                  type="submit"
                  [disabled]="accessLoading() || accessForm.invalid"
                >
                  @if (accessLoading()) {
                    <mat-spinner diameter="20" />
                  } @else {
                    Acceder al evento
                  }
                </button>

                @if (accessError()) {
                  <p class="text-red-500 text-sm text-center">
                    {{ accessError() }}
                  </p>
                }
              </form>
            </mat-card-content>
          </mat-card>
        </div>
      } @else {
        <!-- Event page -->
        <div
          class="min-h-screen"
          [style]="{
            background: event.tenant.brandConfig?.backgroundColor ?? '#f5f5f5',
          }"
        >
          <!-- Header -->
          <header class="bg-white shadow-sm">
            <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              <div class="flex items-center gap-3">
                @if (event.tenant.brandConfig?.logoUrl) {
                  <img [src]="event.tenant.brandConfig?.logoUrl" class="h-8" alt="Logo" />
                } @else {
                  <span class="font-semibold text-gray-800">{{ event.tenant.name }}</span>
                }
              </div>
              <div class="flex items-center gap-2">
                <button
                  mat-icon-button
                  (click)="shareWhatsApp()"
                  matTooltip="Compartir por WhatsApp"
                >
                  <mat-icon>chat</mat-icon>
                </button>
                <button mat-icon-button (click)="shareEmail()" matTooltip="Compartir por email">
                  <mat-icon>email</mat-icon>
                </button>
                <button mat-icon-button (click)="copyLink()" matTooltip="Copiar enlace">
                  <mat-icon>link</mat-icon>
                </button>
              </div>
            </div>
          </header>

          <main class="max-w-4xl mx-auto px-4 py-6">
            <!-- Video player -->
            <div class="aspect-video bg-black rounded-lg overflow-hidden mb-6 relative">
              @if (event.status === 'LIVE') {
                <div
                  class="absolute top-3 left-3 z-10 flex items-center gap-2 bg-red-600 text-white px-2 py-1 rounded text-sm"
                >
                  <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  EN VIVO
                </div>
              }
              @if (event.status === 'LIVE' || event.status === 'FINISHED') {
                <video
                  controls
                  class="w-full h-full"
                  [src]="event.status === 'FINISHED' ? event.recordingUrl : event.slug"
                  poster="{{ event.deceased?.photoUrl ?? '' }}"
                >
                  Tu navegador no soporta video.
                </video>
              } @else {
                <div class="w-full h-full flex items-center justify-center text-white">
                  <div class="text-center">
                    <p class="text-2xl font-bold mb-2">🕊️</p>
                    <p>El evento comenzará pronto</p>
                    @if (event.scheduledAt) {
                      <p class="text-gray-400 text-sm mt-1">
                        {{ event.scheduledAt | date: 'dd/MM/yyyy HH:mm' }}
                      </p>
                    }
                  </div>
                </div>
              }

              @if (event.status === 'LIVE') {
                <div
                  class="absolute bottom-3 right-3 z-10 bg-black/60 text-white px-2 py-1 rounded text-sm"
                >
                  {{ viewerCount() }} espectadores
                </div>
              }
            </div>

            <!-- Deceased info -->
            @if (event.deceased; as deceased) {
              <div class="bg-white rounded-lg p-6 mb-6 flex items-start gap-4">
                @if (deceased.photoUrl) {
                  <img
                    [src]="deceased.photoUrl"
                    class="w-20 h-20 rounded-full object-cover flex-shrink-0"
                  />
                } @else {
                  <div
                    class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"
                  >
                    <mat-icon class="text-gray-400 text-3xl">person</mat-icon>
                  </div>
                }
                <div>
                  <h2 class="text-xl font-bold text-gray-900">
                    {{ deceased.firstName }} {{ deceased.lastName }}
                  </h2>
                  @if (deceased.birthDate || deceased.deathDate) {
                    <p class="text-gray-600 mt-1">
                      @if (deceased.birthDate) {
                        {{ deceased.birthDate | date: 'dd/MM/yyyy' }}
                      }
                      @if (deceased.birthDate && deceased.deathDate) {
                        -
                      }
                      @if (deceased.deathDate) {
                        {{ deceased.deathDate | date: 'dd/MM/yyyy' }}
                      }
                    </p>
                  }
                  @if (deceased.epitaph) {
                    <p class="text-gray-500 italic mt-2">"{{ deceased.epitaph }}"</p>
                  }
                </div>
              </div>
            }

            <!-- Reactions -->
            @if (event.status === 'LIVE') {
              <div class="bg-white rounded-lg p-4 mb-6">
                <p class="text-sm font-medium text-gray-600 mb-3">Envía tu reacción</p>
                <div class="flex gap-2">
                  @for (reaction of reactions; track reaction.type) {
                    <button
                      mat-icon-button
                      (click)="sendReaction(reaction.type)"
                      [disabled]="reactionCooldown()"
                      class="text-2xl hover:scale-125 transition-transform"
                    >
                      {{ reaction.icon }}
                    </button>
                  }
                </div>
                @if (reactionCooldown()) {
                  <p class="text-xs text-gray-400 mt-1">Espera un momento...</p>
                }
              </div>
            }

            <!-- Messages -->
            <div class="bg-white rounded-lg p-6">
              <h3 class="font-semibold text-gray-900 mb-4">Mensajes y Homenajes</h3>

              <form [formGroup]="messageForm" (ngSubmit)="submitMessage()" class="flex gap-2 mb-6">
                <mat-form-field class="flex-1" appearance="outline">
                  <mat-label>Tu nombre</mat-label>
                  <input matInput formControlName="authorName" required />
                </mat-form-field>
                <mat-form-field class="flex-[2]" appearance="outline">
                  <mat-label>Escribe tu mensaje...</mat-label>
                  <input matInput formControlName="content" required maxlength="500" />
                </mat-form-field>
                <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  [disabled]="messageSending() || messageForm.invalid"
                >
                  Enviar
                </button>
              </form>

              <div class="space-y-3 max-h-96 overflow-y-auto">
                @for (msg of messages(); track msg.id) {
                  <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span class="text-xl">{{ iconMap[msg.iconType ?? ''] ?? '💬' }}</span>
                    <div>
                      <p class="font-medium text-sm text-gray-900">
                        {{ msg.authorName }}
                      </p>
                      <p class="text-gray-700 text-sm">{{ msg.content }}</p>
                      <p class="text-xs text-gray-400 mt-0.5">
                        {{ msg.createdAt | date: 'dd/MM HH:mm' }}
                      </p>
                    </div>
                  </div>
                } @empty {
                  <p class="text-gray-500 text-center py-4">
                    @if (event.status === 'SCHEDULED') {
                      Los mensajes se habilitarán cuando el evento comience
                    } @else {
                      No hay mensajes aún. ¡Sé el primero en escribir!
                    }
                  </p>
                }
              </div>
            </div>
          </main>
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(StreamingApiService);
  private readonly socket = inject(StreamingSocketService);
  private readonly snackBar = inject(MatSnackBar);

  /** Indica si los datos del evento están cargando */
  readonly loading = signal(true);
  /** Mensaje de error si el evento no existe */
  readonly error = signal('');
  /** Datos públicos del evento */
  readonly evt = signal<PublicEvent | null>(null);
  /** Indica si el acceso fue concedido (evento público o código válido) */
  readonly accessGranted = signal(false);
  /** Indica si la validación del código está en curso */
  readonly accessLoading = signal(false);
  /** Mensaje de error en la validación del código */
  readonly accessError = signal('');
  /** Lista de mensajes de homenaje */
  readonly messages = signal<SocketMessage[]>([]);
  /** Contador de espectadores en vivo */
  readonly viewerCount = signal(0);
  /** Indica si se está enviando un mensaje */
  readonly messageSending = signal(false);
  /** Indica si el botón de reacción está en cooldown */
  readonly reactionCooldown = signal(false);

  /** Lista de tipos de reacción disponibles */
  readonly reactions = REACTION_ICONS;

  /** Mapa de iconos por tipo */
  readonly iconMap: Partial<Record<string, string>> = {
    HEART: '❤️',
    CANDLE: '🕯️',
    FLOWER: '🌸',
    DOVE: '🕊️',
    heart: '❤️',
    candle: '🕯️',
    flower: '🌸',
    dove: '🕊️',
  };

  /** Formulario de código de acceso */
  accessForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: [''],
    code: ['', Validators.required],
  });

  /** Formulario de envío de mensaje */
  messageForm = this.fb.nonNullable.group({
    authorName: ['', Validators.required],
    content: ['', [Validators.required, Validators.maxLength(500)]],
  });

  private slug = '';
  private eventId = '';

  constructor() {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (this.slug) this.loadPublicEvent();

    this.socket.newMessage$.subscribe((msg) => {
      this.messages.update((prev) => [...prev, msg]);
    });

    this.socket.viewerCount$.subscribe((count) => {
      this.viewerCount.set(count);
    });

    this.socket.streamStatus$.subscribe((status) => {
      this.evt.update((e) => (e ? { ...e, status: status as EventStatus } : e));
    });
  }

  /** Carga los datos públicos del evento desde la API */
  loadPublicEvent(): void {
    this.loading.set(true);
    this.api.findPublic(this.slug).subscribe({
      next: (ev) => {
        this.evt.set(ev);
        this.loading.set(false);
        this.eventId = ev.id;

        if (ev.isPublic) {
          this.accessGranted.set(true);
          this.connectSocket();
        }
      },
      error: (err: { message?: string }) => {
        this.error.set(err.message ?? 'Evento no encontrado');
        this.loading.set(false);
      },
    });
  }

  /** Valida el código de acceso y concede acceso si es correcto */
  submitAccessCode(): void {
    if (this.accessForm.invalid) return;
    this.accessLoading.set(true);
    this.accessError.set('');

    this.api
      .validateAccessCode(this.slug, {
        code: this.accessForm.controls.code.value,
        name: this.accessForm.controls.name.value || undefined,
        email: this.accessForm.controls.email.value || undefined,
        consent: true,
      })
      .subscribe({
        next: (res) => {
          this.accessGranted.set(true);
          this.accessLoading.set(false);
          this.eventId = res.eventId;
          this.connectSocket();
        },
        error: (err: { message?: string }) => {
          this.accessError.set(err.message ?? 'Código incorrecto');
          this.accessLoading.set(false);
        },
      });
  }

  /** Envía un mensaje de homenaje al evento */
  submitMessage(): void {
    if (this.messageForm.invalid) return;
    this.messageSending.set(true);

    this.api
      .sendMessage(this.slug, {
        authorName: this.messageForm.controls.authorName.value,
        content: this.messageForm.controls.content.value,
      })
      .subscribe({
        next: () => {
          this.messageForm.reset({
            authorName: this.messageForm.controls.authorName.value,
            content: '',
          });
          this.messageSending.set(false);
          this.snackBar.open('Mensaje enviado', 'Cerrar', { duration: 2000 });
        },
        error: () => {
          this.messageSending.set(false);
          this.snackBar.open('Error al enviar mensaje', 'Cerrar', {
            duration: 2000,
          });
        },
      });
  }

  /** Envía una reacción rápida con rate limiting de 2 segundos */
  sendReaction(type: string): void {
    if (this.reactionCooldown()) return;
    this.reactionCooldown.set(true);

    this.api.sendReaction(this.slug, { type }).subscribe({
      next: () => {
        setTimeout(() => this.reactionCooldown.set(false), 2000);
      },
      error: () => {
        this.reactionCooldown.set(false);
      },
    });
  }

  /** Comparte el enlace del evento por WhatsApp */
  shareWhatsApp(): void {
    const ev = this.evt();
    const name = ev?.deceased ? `${ev.deceased.firstName} ${ev.deceased.lastName}` : 'la ceremonia';
    const url = window.location.href;
    const text = encodeURIComponent(`Te invitamos a la ceremonia de ${name}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  /** Comparte el enlace del evento por email */
  shareEmail(): void {
    const ev = this.evt();
    const name = ev?.deceased ? `${ev.deceased.firstName} ${ev.deceased.lastName}` : 'la ceremonia';
    const url = window.location.href;
    const subject = encodeURIComponent(`Invitación a ceremonia de ${name}`);
    const body = encodeURIComponent(
      `Te invitamos a seguir la ceremonia de ${name} en vivo:\n\n${url}`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }

  /** Copia el enlace del evento al portapapeles */
  copyLink(): void {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      this.snackBar.open('Enlace copiado', 'Cerrar', { duration: 2000 });
    });
  }

  /** Conecta al Socket.IO para recibir actualizaciones en tiempo real */
  private connectSocket(): void {
    this.socket.connect(this.eventId);
  }
}
