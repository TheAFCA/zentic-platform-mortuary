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
  styles: [`
    :host { display: block; }

    .ss-header { margin-bottom: 1.5rem; }

    .ss-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.25rem;
    }

    .ss-header p {
      margin: 0;
      color: #6b7280;
      font-size: 0.88rem;
    }

    .ss-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

    .ss-card {
      background: #fff;
      border: 1px solid #e7e9ee;
      border-radius: 1rem;
      box-shadow: 0 4px 16px rgba(17, 24, 39, 0.05);
      overflow: hidden;
    }

    .ss-card__header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem 0;
    }

    .ss-card__header mat-icon {
      font-size: 1.35rem;
      width: 1.35rem;
      height: 1.35rem;
      color: #0f5e59;
      flex-shrink: 0;
    }

    .ss-card__header h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1f2937;
    }

    .ss-card__header span {
      font-size: 0.8rem;
      color: #9ca3af;
      font-weight: 400;
    }

    .ss-card__body {
      padding: 1rem 1.5rem 1.5rem;
    }

    .ss-step-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 1rem;
    }

    .ss-step {
      display: flex;
      gap: 0.85rem;
    }

    .ss-step__num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 50%;
      background: #e9f2f1;
      color: #0f5e59;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .ss-step__body { flex: 1; min-width: 0; }

    .ss-step__body p {
      margin: 0;
      font-size: 0.88rem;
      color: #374151;
      line-height: 1.5;
    }

    .ss-step__body strong { color: #1f2937; }

    .ss-step__body a { color: #0f5e59; text-decoration: underline; }

    .ss-step__body code {
      font-size: 0.78rem;
      background: #f3f4f6;
      padding: 0.1em 0.35em;
      border-radius: 4px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }

    .ss-info-box {
      display: flex;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.84rem;
      line-height: 1.5;
      margin-top: 1rem;
    }

    .ss-info-box mat-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .ss-info-box--info {
      background: #edf4fe;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }

    .ss-info-box--tip {
      background: #fefce8;
      border: 1px solid #fde68a;
      color: #92400e;
    }

    .ss-server-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .ss-server-item {
      background: #f9fafb;
      border-radius: 0.75rem;
      padding: 1rem;
    }

    .ss-server-item label {
      display: block;
      font-size: 0.72rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.35rem;
    }

    .ss-server-item .value {
      font-size: 0.85rem;
      font-family: 'SF Mono', 'Fira Code', monospace;
      color: #1f2937;
      word-break: break-all;
      user-select: all;
    }

    .ss-server-item .hint {
      font-size: 0.76rem;
      color: #9ca3af;
      margin-top: 0.35rem;
    }

    .ss-obs-steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.75rem;
    }

    .ss-obs-steps li {
      display: flex;
      gap: 0.65rem;
      font-size: 0.88rem;
      color: #374151;
      line-height: 1.5;
    }

    .ss-obs-steps li .check {
      color: #0f5e59;
      font-size: 1rem;
      flex-shrink: 0;
      margin-top: 0.15rem;
    }

    .ss-obs-steps li code {
      font-size: 0.78rem;
      background: #f3f4f6;
      padding: 0.1em 0.35em;
      border-radius: 4px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }

    .ss-events-empty {
      text-align: center;
      padding: 1.5rem 0;
    }

    .ss-events-empty p {
      color: #9ca3af;
      font-size: 0.88rem;
      margin: 0 0 0.75rem;
    }

    .ss-events-list { display: grid; gap: 0.5rem; }

    .ss-event-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: #f9fafb;
      border-radius: 0.625rem;
      text-decoration: none;
      transition: background 150ms ease;
    }

    .ss-event-item:hover { background: #f3f4f6; }

    .ss-event-item__info { min-width: 0; }

    .ss-event-item__info .title {
      font-size: 0.88rem;
      font-weight: 500;
      color: #1f2937;
      margin: 0;
    }

    .ss-event-item__info .meta {
      font-size: 0.78rem;
      color: #9ca3af;
      margin: 0.1rem 0 0;
    }

    .ss-status-chip {
      flex-shrink: 0;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
    }
  `],
  template: `
    <div>
      <div class="ss-header">
        <h2>Streaming</h2>
        <p>Configuración de transmisión en vivo para eventos funerarios</p>
      </div>

      <mat-divider style="margin-bottom:1.5rem;" />

      <div class="ss-grid">
        <!-- How it works -->
        <div class="ss-card">
          <div class="ss-card__header">
            <mat-icon>timeline</mat-icon>
            <h3>¿Cómo funciona? <span>— Flujo completo de una transmisión en vivo</span></h3>
          </div>
          <div class="ss-card__body">
            <ul class="ss-step-list">
              <li class="ss-step">
                <span class="ss-step__num">1</span>
                <div class="ss-step__body">
                  <p><strong>Programas el evento</strong> desde <a routerLink="/admin/streaming/new">Streaming → Nuevo evento</a> con los datos del servicio y del difunto</p>
                </div>
              </li>
              <li class="ss-step">
                <span class="ss-step__num">2</span>
                <div class="ss-step__body">
                  <p><strong>Obtienes las credenciales</strong> — al crear el evento, el sistema genera una <strong>Stream Key</strong> única y una <strong>URL RTMP</strong> exclusivas</p>
                </div>
              </li>
              <li class="ss-step">
                <span class="ss-step__num">3</span>
                <div class="ss-step__body">
                  <p><strong>Configuras OBS</strong> — en tu computadora de la sede, abres OBS Studio, pones la URL RTMP como Servidor y la Stream Key como Clave</p>
                </div>
              </li>
              <li class="ss-step">
                <span class="ss-step__num">4</span>
                <div class="ss-step__body">
                  <p><strong>Inicias desde el panel</strong> — cuando llegue la hora, haces clic en "Iniciar transmisión" y luego le das a "Iniciar transmisión" en OBS</p>
                </div>
              </li>
              <li class="ss-step">
                <span class="ss-step__num">5</span>
                <div class="ss-step__body">
                  <p><strong>Los familiares ven</strong> — compartes el enlace público <code>/e/:slug</code> y ellos ven la ceremonia en vivo desde su celular</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Provider info -->
        <div class="ss-card">
          <div class="ss-card__header">
            <mat-icon>settings_cloud</mat-icon>
            <h3>Servidor de transmisión <span>— datos para configurar OBS</span></h3>
          </div>
          <div class="ss-card__body">
            <div class="ss-info-box ss-info-box--info">
              <mat-icon>info</mat-icon>
              <div><strong>Importante:</strong> Cada evento tiene su propia Stream Key única. Debes copiar la clave del evento específico que vas a transmitir.</div>
            </div>

            <div class="ss-server-grid" style="margin-top:1rem;">
              <div class="ss-server-item">
                <label>Servidor (RTMP URL)</label>
                <div class="value">rtmps://global-live.mux.com:443/app</div>
                <p class="hint">Valor fijo para todos los eventos de tu cuenta</p>
              </div>
              <div class="ss-server-item">
                <label>Clave de transmisión (Stream Key)</label>
                <div class="value">zentic_••••••••••••••••••••••••••••••••</div>
                <p class="hint">Se genera automáticamente al crear cada evento</p>
              </div>
            </div>
          </div>
        </div>

        <!-- OBS Setup -->
        <div class="ss-card">
          <div class="ss-card__header">
            <mat-icon>videocam</mat-icon>
            <h3>Configurar OBS Studio paso a paso <span>— programa gratuito para transmitir</span></h3>
          </div>
          <div class="ss-card__body">
            <ul class="ss-obs-steps">
              <li>
                <mat-icon class="check">check_circle</mat-icon>
                <span>Descarga OBS desde <a href="https://obsproject.com" target="_blank" rel="noopener" style="color:#0f5e59;text-decoration:underline;">obsproject.com</a> e instálalo en la computadora de la sede</span>
              </li>
              <li>
                <mat-icon class="check">check_circle</mat-icon>
                <span>Abre OBS y ve a <strong>Archivo → Configuración → Transmisión</strong></span>
              </li>
              <li>
                <mat-icon class="check">check_circle</mat-icon>
                <span>En <strong>Servicio</strong> selecciona <strong>"Personalizado…"</strong></span>
              </li>
              <li>
                <mat-icon class="check">check_circle</mat-icon>
                <span>En <strong>Servidor</strong> pega la URL RTMP: <code>rtmps://global-live.mux.com:443/app</code></span>
              </li>
              <li>
                <mat-icon class="check">check_circle</mat-icon>
                <span>En <strong>Clave de transmisión</strong> pega la Stream Key del evento (la copias desde Streaming → ver evento → Credenciales)</span>
              </li>
              <li>
                <mat-icon class="check">check_circle</mat-icon>
                <span>En <strong>Salida</strong> (opcional): resolución 1920×1080, bitrate 2500–4000 Kbps</span>
              </li>
              <li>
                <mat-icon class="check">check_circle</mat-icon>
                <span>OBS empezará a transmitir cuando le des clic a <strong>"Iniciar transmisión"</strong> en OBS. Haz esto después de presionar "Iniciar transmisión" en el panel de ZENTIC.</span>
              </li>
            </ul>

            <div class="ss-info-box ss-info-box--tip">
              <mat-icon>lightbulb</mat-icon>
              <div><strong>Tip:</strong> Prueba la configuración antes del evento. Crea un evento de prueba, inicia la transmisión desde el panel y verifica que OBS se conecte correctamente.</div>
            </div>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="ss-card">
          <div class="ss-card__header">
            <mat-icon>playlist_play</mat-icon>
            <h3>Eventos programados</h3>
          </div>
          <div class="ss-card__body">
            @if (events().length === 0) {
              <div class="ss-events-empty">
                <p>No hay eventos programados todavía</p>
                <a mat-raised-button color="primary" routerLink="/admin/streaming/new">
                  <mat-icon>add</mat-icon> Crear primer evento
                </a>
              </div>
            } @else {
              <div class="ss-events-list">
                @for (ev of events(); track ev.id) {
                  <a [routerLink]="['/admin/streaming', ev.id]" class="ss-event-item">
                    <div class="ss-event-item__info">
                      <p class="title">{{ ev.title }}</p>
                      <p class="meta">
                        {{ ev.scheduledAt | date: 'dd/MM/yyyy HH:mm' }}
                        @if (ev.deceased) { · {{ ev.deceased.firstName }} {{ ev.deceased.lastName }} }
                      </p>
                    </div>
                    <span class="ss-status-chip {{ statusClass(ev.status) }}">{{ statusLabel(ev.status) }}</span>
                  </a>
                }
              </div>
            }
          </div>
        </div>
      </div>
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
      SCHEDULED: 'background:#ecfdf5;color:#065f46;',
      LIVE: 'background:#fef3c7;color:#92400e;',
      PAUSED: 'background:#fef3c7;color:#92400e;',
      FINISHED: 'background:#f3f4f6;color:#6b7280;',
      CANCELLED: 'background:#fee2e2;color:#991b1b;',
    };
    return map[status] ?? 'background:#f3f4f6;color:#6b7280;';
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
