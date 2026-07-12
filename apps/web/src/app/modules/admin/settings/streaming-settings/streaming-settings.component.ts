import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StreamingApiService } from '../../../../core/services/streaming-api.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-streaming-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-lg font-bold text-gray-900 mb-1">Streaming</h2>
        <p class="text-sm text-gray-500">
          Configuración de transmisión en vivo para eventos funerarios
        </p>
      </div>

      <mat-divider />

      <!-- How it works -->
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>timeline</mat-icon>
          <mat-card-title>¿Cómo funciona?</mat-card-title>
          <mat-card-subtitle>
            Flujo completo de una transmisión en vivo
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="p-4">
          <ol class="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>
              <strong>Programas el evento</strong> — desde
              <a routerLink="/admin/streaming/new" class="text-primary underline">Streaming → Nuevo evento</a>
              con los datos del servicio y del difunto
            </li>
            <li>
              <strong>Obtienes las credenciales</strong> — al crear el evento, el sistema genera
              una Stream Key única y una URL RTMP exclusivas
            </li>
            <li>
              <strong>Configuras OBS</strong> — en tu computadora de la sede, abres OBS Studio,
              pones la URL RTMP como Servidor y la Stream Key como Clave
            </li>
            <li>
              <strong>Inicias desde el panel</strong> — cuando llegue la hora, haces clic en
              "Iniciar transmisión" y luego le das a "Iniciar transmisión" en OBS
            </li>
            <li>
              <strong>Los familiares ven</strong> — compartes el enlace público
              <code class="text-xs bg-gray-100 px-1 rounded">/e/:slug</code>
              y ellos ven la ceremonia en vivo desde su celular
            </li>
          </ol>
        </mat-card-content>
      </mat-card>

      <!-- Provider info -->
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>settings_cloud</mat-icon>
          <mat-card-title>Servidor de transmisión</mat-card-title>
          <mat-card-subtitle>
            Estos datos los necesitas para configurar OBS en tu computadora
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="p-4 space-y-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Importante:</strong> Cada evento tiene su propia Stream Key única.
            Debes copiar la clave del evento específico que vas a transmitir.
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-lg p-3">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Servidor (RTMP URL)</label>
              <p class="text-sm font-mono text-gray-900 mt-1 break-all select-all">rtmps://global-live.mux.com:443/app</p>
              <p class="text-xs text-gray-400 mt-1">Este valor es fijo para todos los eventos de tu cuenta</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clave de transmisión (Stream Key)</label>
              <p class="text-sm font-mono text-gray-900 mt-1">zentic_••••••••••••••••••••••••••••••••</p>
              <p class="text-xs text-gray-400 mt-1">Se genera automáticamente al crear cada evento — única por evento</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- OBS Setup -->
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>videocam</mat-icon>
          <mat-card-title>Configurar OBS Studio paso a paso</mat-card-title>
          <mat-card-subtitle>
            Programa gratuito para capturar y transmitir video desde tu sede
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="p-4 space-y-4">
          <ol class="list-decimal list-inside space-y-3 text-sm text-gray-700">
            <li>
              Descarga OBS desde
              <a href="https://obsproject.com" target="_blank" rel="noopener" class="text-primary underline">obsproject.com</a>
              e instálalo en la computadora de la sede donde se realizará la ceremonia
            </li>
            <li>
              Abre OBS y ve a <strong>Archivo → Configuración → Transmisión</strong>
            </li>
            <li>
              En <strong>Servicio</strong> selecciona <strong>"Personalizado…"</strong>
            </li>
            <li>
              En <strong>Servidor</strong> pega la URL RTMP de arriba:
              <code class="block mt-1 p-2 bg-gray-100 rounded text-xs font-mono break-all select-all">rtmps://global-live.mux.com:443/app</code>
            </li>
            <li>
              En <strong>Clave de transmisión</strong> pega la Stream Key del evento
              <span class="text-gray-500">(la copias desde Streaming → ver evento → Credenciales)</span>
            </li>
            <li>
              En <strong>Salida</strong> (opcional): resolución 1920×1080, bitrate 2500-4000 Kbps
            </li>
            <li>
              <strong>Importante:</strong> OBS solo empezará a transmitir cuando le des clic a
              <strong>"Iniciar transmisión"</strong> en OBS.
              Debes hacer esto después de haber presionado "Iniciar transmisión" en el panel de ZENTIC.
            </li>
          </ol>

          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>💡 Tip:</strong> Prueba la configuración antes del evento.
            Crea un evento de prueba, inicia la transmisión desde el panel y verifica que OBS se conecte correctamente.
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Quick actions -->
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>playlist_play</mat-icon>
          <mat-card-title>Eventos programados</mat-card-title>
          <mat-card-subtitle>
            Haz clic en un evento para ver sus credenciales y panel de control
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="p-4">
          @if (events().length === 0) {
            <div class="text-center py-6">
              <p class="text-sm text-gray-500 mb-4">No hay eventos programados todavía</p>
              <a mat-raised-button color="primary" routerLink="/admin/streaming/new">
                <mat-icon>add</mat-icon> Crear primer evento
              </a>
            </div>
          } @else {
            <div class="space-y-2">
              @for (ev of events(); track ev.id) {
                <a
                  [routerLink]="['/admin/streaming', ev.id]"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p class="font-medium text-sm text-gray-900">{{ ev.title }}</p>
                    <p class="text-xs text-gray-500">
                      {{ ev.scheduledAt | date : 'dd/MM/yyyy HH:mm' }}
                      @if (ev.deceased) {
                        · {{ ev.deceased.firstName }} {{ ev.deceased.lastName }}
                      }
                    </p>
                  </div>
                  <span
                    class="text-xs font-medium px-2 py-0.5 rounded-full {{ statusClass(ev.status) }}"
                  >
                    {{ statusLabel(ev.status) }}
                  </span>
                </a>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreamingSettingsComponent {
  private readonly api = inject(StreamingApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly events = signal<any[]>([]);

  constructor() {
    this.api.findAll().subscribe({
      next: (list) => this.events.set(list),
      error: () => this.snackBar.open('Error al cargar eventos', 'Cerrar', { duration: 3000 }),
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-700',
      LIVE: 'bg-green-100 text-green-700',
      PAUSED: 'bg-yellow-100 text-yellow-700',
      FINISHED: 'bg-gray-100 text-gray-600',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'Programado',
      LIVE: 'En vivo',
      PAUSED: 'Pausado',
      FINISHED: 'Finalizado',
      CANCELLED: 'Cancelado',
    };
    return map[status] ?? status;
  }
}
