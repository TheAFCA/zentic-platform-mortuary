import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      .confirm-dialog__backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }

      .confirm-dialog__card {
        width: 100%;
        max-width: 26rem;
        border-radius: 1.1rem;
        background: #fff;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22);
        padding: 1.5rem;
      }

      .confirm-dialog__card h2 {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
        font-weight: 700;
        color: #1f2937;
      }

      .confirm-dialog__card p {
        margin: 0 0 1rem;
        color: #4b5563;
        line-height: 1.5;
      }

      .confirm-dialog__actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1rem;
      }

      .confirm-dialog__button {
        border: 0;
        border-radius: 0.75rem;
        padding: 0.6rem 1.1rem;
        font-weight: 600;
        cursor: pointer;
      }

      .confirm-dialog__button--cancel {
        background: #f3f4f6;
        color: #1f2937;
      }

      .confirm-dialog__button--confirm {
        background: linear-gradient(135deg, #0f5e59, #0b4c48);
        color: #fff;
      }

      .confirm-dialog__button--danger {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: #fff;
      }
    `,
  ],
  template: `
    <div class="confirm-dialog__backdrop" *ngIf="open" (click)="onCancel()">
      <div
        class="confirm-dialog__card"
        (click)="$event.stopPropagation()"
        data-testid="confirm-dialog"
      >
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
