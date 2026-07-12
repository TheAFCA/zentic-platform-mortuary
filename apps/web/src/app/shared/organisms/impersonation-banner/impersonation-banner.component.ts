import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';

@Component({
  selector: 'app-impersonation-banner',
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      .impersonation-banner {
        position: sticky;
        top: 0;
        z-index: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 0.65rem 1rem;
        background: #b91c1c;
        color: #fff;
        font-weight: 600;
        font-size: 0.9rem;
      }

      .impersonation-banner__timer {
        font-variant-numeric: tabular-nums;
        opacity: 0.85;
      }

      .impersonation-banner__exit {
        border: 1px solid rgba(255, 255, 255, 0.6);
        background: transparent;
        color: #fff;
        border-radius: 0.6rem;
        padding: 0.3rem 0.9rem;
        font-weight: 600;
        cursor: pointer;
      }

      .impersonation-banner__exit:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    `,
  ],
  template: `
    <div class="impersonation-banner" role="alert" data-testid="impersonation-banner">
      <span>⚠️ Estás en modo impersonación como admin de {{ tenantName }}</span>
      <span class="impersonation-banner__timer">{{ remainingLabel() }}</span>
      <button type="button" class="impersonation-banner__exit" (click)="exit.emit()">Salir</button>
    </div>
  `,
})
export class ImpersonationBannerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) tenantName = '';
  @Input({ required: true }) expiresAt = '';
  @Output() expired = new EventEmitter<void>();
  @Output() exit = new EventEmitter<void>();

  readonly remainingLabel = signal('30:00');
  private intervalId?: ReturnType<typeof setInterval>;
  private hasEmittedExpired = false;

  ngOnInit(): void {
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private tick(): void {
    const msLeft = new Date(this.expiresAt).getTime() - Date.now();
    if (msLeft <= 0) {
      this.remainingLabel.set('00:00');
      if (!this.hasEmittedExpired) {
        this.hasEmittedExpired = true;
        this.expired.emit();
      }
      return;
    }

    const totalSeconds = Math.floor(msLeft / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.remainingLabel.set(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }
}
