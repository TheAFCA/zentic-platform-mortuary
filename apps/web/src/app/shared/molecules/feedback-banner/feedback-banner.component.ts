import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FeedbackBannerKind = 'error' | 'warning' | 'info' | 'success';

@Component({
  selector: 'app-feedback-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      *ngIf="message"
      class="feedback-banner"
      [attr.data-kind]="kind"
      [attr.role]="kind === 'error' ? 'alert' : 'status'"
      [attr.aria-live]="kind === 'error' ? 'assertive' : 'polite'"
    >
      <div>
        <strong>{{ title }}</strong>
        <p>{{ message }}</p>
      </div>
      <button *ngIf="retryLabel" type="button" (click)="retry.emit()">{{ retryLabel }}</button>
    </section>
  `,
  styles: `
    .feedback-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.1rem;
      border: 1px solid #93c5fd;
      border-radius: 0.75rem;
      color: #1e3a8a;
      background: #eff6ff;
    }

    .feedback-banner[data-kind='error'] {
      border-color: #fca5a5;
      color: var(--error-text, #991b1b);
      background: var(--error-bg, #fef2f2);
    }

    .feedback-banner[data-kind='warning'] {
      border-color: #fcd34d;
      color: var(--warning-text, #92400e);
      background: var(--warning-bg, #fffbeb);
    }

    .feedback-banner[data-kind='success'] {
      border-color: #86efac;
      color: var(--success-text, #166534);
      background: var(--success-bg, #f0fdf4);
    }

    p {
      margin: 0.2rem 0 0;
    }

    button {
      min-height: 2.75rem;
      padding: 0.55rem 1rem;
      border: 1px solid currentColor;
      border-radius: 0.65rem;
      color: inherit;
      background: #fff;
      font-weight: 700;
      cursor: pointer;
    }

    @media (max-width: 640px) {
      .feedback-banner {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `,
})
export class FeedbackBannerComponent {
  @Input() message = '';
  @Input() title = 'Información';
  @Input() kind: FeedbackBannerKind = 'info';
  @Input() retryLabel = '';
  @Output() retry = new EventEmitter<void>();
}
