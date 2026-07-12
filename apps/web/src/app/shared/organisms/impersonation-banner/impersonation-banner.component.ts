import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';

@Component({
  selector: 'app-impersonation-banner',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .impersonation-banner {
      position: sticky;
      top: 0;
      z-index: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 0.65rem 1rem;
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: #fff;
      font-weight: 600;
      font-size: 0.9rem;
      flex-wrap: wrap;
      box-shadow: 0 4px 16px rgba(185, 28, 28, 0.3);
    }

    .impersonation-banner__icon {
      flex: 0 0 auto;
    }

    .impersonation-banner__timer {
      font-variant-numeric: tabular-nums;
      opacity: 0.85;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .impersonation-banner__exit {
      border: 1px solid rgba(255, 255, 255, 0.6);
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      border-radius: 0.65rem;
      padding: 0.35rem 0.9rem;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 150ms ease;
    }

    .impersonation-banner__exit:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .impersonation-banner__exit:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
  `],
  template: `
    <div class="impersonation-banner" role="alert" data-testid="impersonation-banner">
      <span class="impersonation-banner__icon">&#9888;&#65039;</span>
      <span>Modo impersonación como admin de <strong>{{ tenantName }}</strong></span>
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
