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
        class="hls-player"
        role="application"
        aria-label="Reproductor de video {{ mode() === 'live' ? 'en vivo' : 'grabación' }}"
      >
        <video
          #videoEl
          [attr.controls]="mode() === 'recording' ? true : null"
          class="hls-player__video"
          playsinline
          [muted]="mode() === 'live' ? liveMuted() : false"
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
  private nativeListeners: Array<{
    el: HTMLElement;
    type: string;
    fn: EventListener;
  }> = [];

  readonly videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');

  readonly status = signal<PlayerStatus>('loading');
  readonly liveMuted = signal(true);
  private userToggledMute = false;

  readonly src = input<string | null>(null);
  readonly posterUrl = input('');
  readonly mode = input<PlayerMode>('live');
  readonly playbackRefreshRequested = output<void>();

  constructor() {
    afterRenderEffect({ write: () => this.onSrcChange() });
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

  private markReady(): void {
    this.status.set('ready');
    if (this.mode() === 'live' && !this.userToggledMute) {
      this.liveMuted.set(false);
    }
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
  }

  toggleMute(): void {
    this.userToggledMute = true;
    this.liveMuted.update((muted) => !muted);
  }

  toggleFullscreen(): void {
    const video = this.videoEl()?.nativeElement;
    if (!video) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void video.requestFullscreen();
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
  }
}
