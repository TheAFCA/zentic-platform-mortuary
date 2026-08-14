import {
  Component,
  input,
  output,
  signal,
  ElementRef,
  viewChild,
  afterRenderEffect,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import type HlsJs from 'hls.js';

export type PlayerStatus = 'loading' | 'ready' | 'reconnecting' | 'no_signal' | 'error';
export type PlayerMode = 'live' | 'recording';

@Component({
  selector: 'app-hls-player',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (src(); as url) {
      <div
        #playerContainer
        class="hls-player"
        role="application"
        aria-label="Reproductor de video {{ mode() === 'live' ? 'en vivo' : 'grabación' }}"
      >
        <video
          #videoEl
          [attr.controls]="mode() === 'recording' ? true : null"
          class="hls-player__video"
          playsinline
          [autoplay]="mode() === 'live'"
          [muted]="mode() === 'live' ? liveMuted() : false"
          [attr.muted]="mode() === 'live' && liveMuted() ? '' : null"
          [attr.poster]="posterUrl() || null"
        ></video>

        <div class="hls-player__overlay" aria-live="polite" aria-atomic="true">
          @if (status() !== 'ready') {
            @switch (status()) {
              @case ('loading') {
                <div class="hls-player__indicator">
                  <mat-icon class="animate-spin">refresh</mat-icon>
                  <span>Conectando...</span>
                </div>
              }
              @case ('no_signal') {
                <div class="hls-player__indicator hls-player__indicator--warning">
                  <mat-icon>videocam_off</mat-icon>
                  <span>Sin señal</span>
                </div>
              }
              @case ('reconnecting') {
                <div class="hls-player__indicator hls-player__indicator--warning">
                  <mat-icon class="animate-spin">sync</mat-icon>
                  <span>Reconectando...</span>
                </div>
              }
              @case ('error') {
                <div class="hls-player__indicator hls-player__indicator--error" role="alert">
                  <mat-icon>error_outline</mat-icon>
                  <span>Error de reproducción</span>
                </div>
              }
            }
          } @else if (mode() === 'recording') {
            <div class="hls-player__indicator">
              <mat-icon>check_circle</mat-icon>
              <span>Transmisión finalizada</span>
            </div>
          }
        </div>

        @if (status() === 'ready' && mode() === 'live') {
          <div class="hls-player__live-badge">
            <span class="hls-player__dot"></span>
            EN VIVO
          </div>
          <div class="hls-player__live-controls">
            <button
              type="button"
              class="hls-player__live-btn"
              (click)="toggleMute()"
              [attr.aria-label]="liveMuted() ? 'Activar sonido' : 'Silenciar'"
            >
              <mat-icon>{{ liveMuted() ? 'volume_off' : 'volume_up' }}</mat-icon>
            </button>
            <button
              type="button"
              class="hls-player__live-btn"
              (click)="toggleFullscreen()"
              aria-label="Pantalla completa"
            >
              <mat-icon>fullscreen</mat-icon>
            </button>
          </div>
        }
      </div>
    } @else {
      <div class="hls-player">
        <div class="hls-player__placeholder">
          <mat-icon>videocam</mat-icon>
          <ng-content />
        </div>
      </div>
    }
  `,
  styles: `
    .hls-player {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .hls-player__video {
      width: 100%;
      height: 100%;
      display: block;
    }
    .hls-player__overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .hls-player__indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #fff;
      background: rgba(0, 0, 0, 0.6);
      padding: 0.75rem 1.25rem;
      border-radius: 999px;
      font-size: 0.875rem;
    }
    .hls-player__indicator--warning {
      background: rgba(234, 179, 8, 0.2);
      color: #fbbf24;
    }
    .hls-player__indicator--error {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    .hls-player__live-badge {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      background: #dc2626;
      color: #fff;
      padding: 0.25rem 0.625rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .hls-player__live-controls {
      position: absolute;
      bottom: 0.75rem;
      right: 0.75rem;
      display: flex;
      gap: 0.5rem;
    }
    .hls-player__live-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border: none;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      cursor: pointer;
      padding: 0;
    }
    .hls-player__live-btn:hover {
      background: rgba(0, 0, 0, 0.75);
    }
    .hls-player__live-btn mat-icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
    }
    .hls-player__dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      background: #fff;
      animation: pulse 1.5s ease-in-out infinite;
    }
    .hls-player__placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #9ca3af;
      font-size: 0.875rem;
    }
    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.3;
      }
    }
    :host {
      display: contents;
    }
  `,
})
export class HlsPlayerComponent implements OnDestroy {
  private hls: HlsJs | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private activeUrl: string | null = null;
  private activeVideo: HTMLVideoElement | null = null;
  private playbackGeneration = 0;
  private refreshRequestedGeneration: number | null = null;
  private frozenFrameInterval: ReturnType<typeof setInterval> | null = null;
  private lastObservedTime = -1;
  private stalledFrameChecks = 0;
  private nativeListeners: Array<{
    el: HTMLElement;
    type: string;
    fn: EventListener;
  }> = [];

  readonly videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  readonly playerContainer = viewChild<ElementRef<HTMLElement>>('playerContainer');

  readonly status = signal<PlayerStatus>('loading');
  readonly liveMuted = signal(true);
  private userToggledMute = false;

  readonly src = input<string | null>(null);
  readonly posterUrl = input('');
  readonly mode = input<PlayerMode>('live');
  readonly playbackRefreshRequested = output<void>();

  /**
   * Chrome exige "user activation" real (un evento confiable del DOM: click, tecla,
   * touch, scroll) para desbloquear el autoplay en ciertos escenarios de MSE/hls.js —
   * un setInterval o un cambio de estilo por JS nunca cuentan para esto, sin importar
   * cuántas veces se reintente .play() programáticamente. Por eso el usuario notaba que
   * scrollear o pasar a pantalla completa "destrababa" el stream: eran los primeros
   * eventos reales de interacción. Este listener automatiza exactamente eso, una sola
   * vez por interacción real, en vez de depender de que el usuario lo descubra solo.
   *
   * También es el único momento seguro para activar el audio automáticamente: en una
   * pestaña sin Media Engagement Index alto para este origen (primera visita del
   * espectador, típico en la página pública tras un enlace compartido), Chrome bloquea
   * — y pausa — un `video.muted = false` disparado por script sin un gesto real, aunque
   * el video ya estuviera reproduciéndose muted. Por eso el auto-unmute NO se dispara al
   * llegar a "ready" (ver markReady) sino acá, donde si hay un gesto legítimo.
   */
  private static readonly INTERACTION_EVENTS: Array<keyof DocumentEventMap> = [
    'pointerdown',
    'keydown',
    'touchstart',
    'scroll',
    'wheel',
  ];
  private readonly onInteraction = (): void => {
    const video = this.activeVideo;
    if (!video || this.mode() !== 'live') return;
    if (!this.userToggledMute && this.liveMuted()) {
      this.liveMuted.set(false);
    }
    if (video.paused) {
      video.play().catch(() => {});
    }
  };

  constructor() {
    afterRenderEffect({ write: () => this.onSrcChange() });
    for (const type of HlsPlayerComponent.INTERACTION_EVENTS) {
      document.addEventListener(type, this.onInteraction, { passive: true });
    }
  }

  private onSrcChange(): void {
    const url = this.src();
    const video = this.videoEl()?.nativeElement;
    if (url === this.activeUrl && video === this.activeVideo) return;

    const generation = ++this.playbackGeneration;
    this.refreshRequestedGeneration = null;
    this.destroyPlayback();
    this.status.set('loading');
    this.liveMuted.set(true);
    this.userToggledMute = false;
    if (!url || !video) return;

    this.activeUrl = url;
    this.activeVideo = video;
    void this.playWithHlsJs(url, video, generation);
  }

  private playNative(url: string, video: HTMLVideoElement, generation: number): void {
    video.src = url;

    this.addNativeListener(video, 'loadedmetadata', () => {
      if (!this.isCurrentPlayback(url, video, generation)) return;
      this.markReady();
      video.play().catch(() => {});
    });
    this.addNativeListener(video, 'error', () => {
      if (!this.isCurrentPlayback(url, video, generation)) return;
      this.requestPlaybackRefresh(generation);
      this.status.set('error');
    });
    this.addNativeListener(video, 'waiting', () => {
      if (!this.isCurrentPlayback(url, video, generation)) return;
      if (this.status() === 'ready') this.status.set('reconnecting');
    });
    this.addNativeListener(video, 'stalled', () => {
      if (!this.isCurrentPlayback(url, video, generation)) return;
      if (this.status() === 'ready') this.status.set('no_signal');
    });
    this.addNativeListener(video, 'canplay', () => {
      if (!this.isCurrentPlayback(url, video, generation)) return;
      this.markReady();
    });
    this.addNativeListener(video, 'playing', () => {
      if (!this.isCurrentPlayback(url, video, generation)) return;
      this.markReady();
    });
    this.addLiveGuards(video, url, generation);
  }

  private async playWithHlsJs(
    url: string,
    video: HTMLVideoElement,
    generation: number,
  ): Promise<void> {
    try {
      const HlsModule = await import('hls.js');
      if (!this.isCurrentPlayback(url, video, generation)) return;

      const Hls = HlsModule.default;
      if (!Hls.isSupported()) {
        const canPlayNative = video.canPlayType('application/vnd.apple.mpegurl');
        if (canPlayNative === 'probably' || canPlayNative === 'maybe') {
          this.playNative(url, video, generation);
        } else {
          this.status.set('error');
        }
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 15,
      });

      this.hls = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!this.isCurrentPlayback(url, video, generation)) return;
        this.markReady();
        video.play().catch(() => {});
      });

      hls.on(
        Hls.Events.ERROR,
        (_ev: unknown, data: { fatal: boolean; type: string; details: string }) => {
          if (!this.isCurrentPlayback(url, video, generation)) return;
          if (data.details === 'bufferStalledError') {
            if (this.status() === 'ready') this.status.set('no_signal');
            return;
          }
          if (data.fatal) {
            if (data.type === 'networkError') {
              this.requestPlaybackRefresh(generation);
              this.status.set('reconnecting');
              if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
              }
              this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                if (this.isCurrentPlayback(url, video, generation)) {
                  hls.startLoad();
                }
              }, 3000);
            } else if (data.type === 'mediaError') {
              this.status.set('reconnecting');
              hls.recoverMediaError();
            } else {
              this.status.set('error');
            }
          }
        },
      );

      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (!this.isCurrentPlayback(url, video, generation)) return;
        if (this.status() === 'reconnecting' || this.status() === 'loading') {
          this.markReady();
        }
      });

      this.addNativeListener(video, 'waiting', () => {
        if (!this.isCurrentPlayback(url, video, generation)) return;
        if (this.status() === 'ready') this.status.set('reconnecting');
      });
      this.addNativeListener(video, 'playing', () => {
        if (!this.isCurrentPlayback(url, video, generation)) return;
        this.markReady();
      });
      this.addLiveGuards(video, url, generation);
    } catch {
      if (this.isCurrentPlayback(url, video, generation)) {
        this.status.set('error');
      }
    }
  }

  private isCurrentPlayback(url: string, video: HTMLVideoElement, generation: number): boolean {
    return (
      generation === this.playbackGeneration && url === this.activeUrl && video === this.activeVideo
    );
  }

  private requestPlaybackRefresh(generation: number): void {
    if (this.refreshRequestedGeneration === generation) return;
    this.refreshRequestedGeneration = generation;
    this.playbackRefreshRequested.emit();
  }

  /**
   * No auto-unmutea acá: hacerlo sin un gesto real del usuario dispara el bloqueo de
   * autoplay-con-audio de Chrome en pestañas sin engagement previo con el origen,
   * pausando el video silenciosamente (ver el comentario de onInteraction). El video
   * arranca y se queda muted hasta la primera interacción real — sigue reproduciéndose
   * en vivo siempre, con o sin esa interacción.
   */
  private markReady(): void {
    this.status.set('ready');
  }

  /** Impide pausar o retroceder en vivo: sin barra de progreso ni botón de play, el usuario siempre ve el borde en vivo. */
  private addLiveGuards(video: HTMLVideoElement, url: string, generation: number): void {
    this.addNativeListener(video, 'pause', () => {
      if (!this.isCurrentPlayback(url, video, generation)) return;
      if (this.mode() === 'live') video.play().catch(() => {});
    });
    this.addNativeListener(video, 'keydown', (event) => {
      if (this.mode() !== 'live') return;
      const blocked = [
        ' ',
        'k',
        'K',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ];
      if (blocked.includes((event as KeyboardEvent).key)) {
        event.preventDefault();
      }
    });
    if (this.mode() === 'live') {
      this.startFrozenFrameWatchdog(video, url, generation);
    }
  }

  /**
   * Bug conocido de Chrome: el <video> deja de repintar el frame visualmente aunque
   * hls.js sigue decodificando bien por debajo (currentTime avanza) — parece que el
   * streaming murió cuando en realidad solo se congeló la composición. Pasar a pantalla
   * completa lo destraba manualmente; este vigilante lo detecta y lo corrige solo.
   */
  private startFrozenFrameWatchdog(video: HTMLVideoElement, url: string, generation: number): void {
    this.stopFrozenFrameWatchdog();
    this.lastObservedTime = -1;
    this.stalledFrameChecks = 0;
    this.frozenFrameInterval = setInterval(() => {
      if (!this.isCurrentPlayback(url, video, generation)) {
        this.stopFrozenFrameWatchdog();
        return;
      }
      if (this.status() !== 'ready') {
        // Mismo bug de Chrome, pero antes de llegar a "ready": el pipeline de video/MSE
        // puede quedar completamente estancado en "Conectando..." hasta que la pestaña
        // recibe cualquier interacción (scroll, fullscreen, cambiar de pestaña) — un
        // empujón periódico evita depender de que el usuario lo descubra por accidente.
        this.nudgeRepaint(video);
        video.play().catch(() => {});
        this.lastObservedTime = video.currentTime;
        this.stalledFrameChecks = 0;
        return;
      }
      if (video.paused) {
        // El listener de 'pause' ya intenta reanudar, pero si ese play() fue rechazado
        // en ese momento puntual (autoplay bloqueado, promesa rechazada y descartada),
        // nadie vuelve a intentarlo — sobre todo tras una recarga completa de la página
        // pública, donde no hay ninguna interacción previa del usuario en la pestaña.
        // Reintentamos acá cada 2s en vez de quedar pausado indefinidamente.
        this.lastObservedTime = video.currentTime;
        this.stalledFrameChecks = 0;
        video.play().catch(() => {});
        return;
      }
      if (video.currentTime !== this.lastObservedTime) {
        this.lastObservedTime = video.currentTime;
        this.stalledFrameChecks = 0;
        return;
      }
      this.stalledFrameChecks++;
      if (this.stalledFrameChecks === 1) {
        this.nudgeRepaint(video);
      } else if (this.stalledFrameChecks === 2) {
        video.play().catch(() => {});
      } else if (this.stalledFrameChecks >= 3) {
        this.stalledFrameChecks = 0;
        this.requestPlaybackRefresh(generation);
      }
    }, 2000);
  }

  /** Fuerza al navegador a recomponer el frame sin tocar la posición de reproducción. */
  private nudgeRepaint(video: HTMLVideoElement): void {
    video.style.transform = 'translateZ(0)';
    requestAnimationFrame(() => {
      video.style.transform = '';
    });
  }

  private stopFrozenFrameWatchdog(): void {
    if (this.frozenFrameInterval) {
      clearInterval(this.frozenFrameInterval);
      this.frozenFrameInterval = null;
    }
  }

  toggleMute(): void {
    this.userToggledMute = true;
    this.liveMuted.update((muted) => !muted);
  }

  /**
   * Pide fullscreen sobre el contenedor, no sobre el <video> directamente: al
   * fullscreenear el <video> el navegador activa su propia UI nativa de video
   * (barra de progreso + botón de play), que no se puede ocultar con el atributo
   * `controls`. Fullscreeneando el div se evita ese modo especial y de paso el
   * badge de EN VIVO y los botones propios (mute/fullscreen) siguen visibles.
   */
  toggleFullscreen(): void {
    const container = this.playerContainer()?.nativeElement;
    if (!container) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void container.requestFullscreen();
    }
  }

  private addNativeListener(el: HTMLElement, type: string, fn: EventListener): void {
    el.addEventListener(type, fn);
    this.nativeListeners.push({ el, type, fn });
  }

  private removeNativeListeners(): void {
    for (const { el, type, fn } of this.nativeListeners) {
      el.removeEventListener(type, fn);
    }
    this.nativeListeners = [];
  }

  private destroyPlayback(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopFrozenFrameWatchdog();
    this.removeNativeListeners();
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch {
        /* ignore */
      }
      this.hls = null;
    }
    const video = this.activeVideo;
    if (video) {
      video.removeAttribute('src');
      video.load();
    }
    this.activeUrl = null;
    this.activeVideo = null;
  }

  ngOnDestroy(): void {
    this.playbackGeneration++;
    this.destroyPlayback();
    for (const type of HlsPlayerComponent.INTERACTION_EVENTS) {
      document.removeEventListener(type, this.onInteraction);
    }
  }
}
