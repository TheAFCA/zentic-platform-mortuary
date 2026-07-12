import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  styles: [
    `
      .confirm-dialog__backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
        animation: fadeIn 150ms ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .confirm-dialog__card {
        width: 100%;
        max-width: 27rem;
        border-radius: 1.5rem;
        background: #fff;
        box-shadow: 0 28px 64px rgba(15, 23, 42, 0.28);
        padding: 1.75rem;
        animation: slideUp 200ms ease-out;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(12px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .confirm-dialog__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        border-radius: 1rem;
        margin-bottom: 1rem;
        background: linear-gradient(135deg, #0f5e59, #0b4c48);
        color: #fff;
        box-shadow: 0 12px 24px rgba(15, 94, 89, 0.22);
      }

      .confirm-dialog__card--danger .confirm-dialog__icon {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        box-shadow: 0 12px 24px rgba(220, 38, 38, 0.22);
      }

      .confirm-dialog__card h2 {
        margin: 0 0 0.5rem;
        font-size: 1.15rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: #111827;
      }

      .confirm-dialog__card p {
        margin: 0 0 1rem;
        color: #4b5563;
        line-height: 1.55;
        font-size: 0.95rem;
      }

      .confirm-dialog__actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.25rem;
      }

      .confirm-dialog__button {
        border: 0;
        border-radius: 0.85rem;
        padding: 0.65rem 1.2rem;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition:
          transform 150ms ease,
          box-shadow 150ms ease;
      }

      .confirm-dialog__button:hover {
        transform: translateY(-1px);
      }

      .confirm-dialog__button:active {
        transform: translateY(0);
      }

      .confirm-dialog__button:focus-visible {
        outline: 2px solid var(--brand-primary, #0f5e59);
        outline-offset: 2px;
      }

      .confirm-dialog__button--cancel {
        background: #f9fafb;
        color: #1f2937;
        border: 1px solid #e7e9ee;
      }

      .confirm-dialog__button--cancel:hover {
        background: #f3f4f6;
      }

      .confirm-dialog__button--confirm {
        background: linear-gradient(135deg, #0f5e59, #0b4c48);
        color: #fff;
        box-shadow: 0 12px 24px rgba(15, 94, 89, 0.2);
      }

      .confirm-dialog__button--danger {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: #fff;
        box-shadow: 0 12px 24px rgba(220, 38, 38, 0.2);
      }
    `,
  ],
  template: `
    <div class="confirm-dialog__backdrop" *ngIf="open" (click)="onCancel()">
      <div
        class="confirm-dialog__card"
        [class.confirm-dialog__card--danger]="danger"
        (click)="$event.stopPropagation()"
        data-testid="confirm-dialog"
      >
        <span class="confirm-dialog__icon">
          <mat-icon>{{ danger ? 'warning' : 'help_outline' }}</mat-icon>
        </span>
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
        <ng-content />
        <div class="confirm-dialog__actions">
          <button
            type="button"
            class="confirm-dialog__button confirm-dialog__button--cancel"
            (click)="onCancel()"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="confirm-dialog__button"
            [class.confirm-dialog__button--danger]="danger"
            [class.confirm-dialog__button--confirm]="!danger"
            data-testid="confirm-dialog-confirm"
            (click)="onConfirm()"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';
  @Input() danger = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
