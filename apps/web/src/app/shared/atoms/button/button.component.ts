import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  styles: [`
    :host {
      display: block;
    }

    button {
      width: 100%;
      min-height: 3.35rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      border: 0;
      border-radius: 1rem;
      padding: 0.9rem 1.1rem;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(
        135deg,
        var(--brand-primary, #0f5e59),
        var(--brand-primary-hover, #0b4c48)
      );
      box-shadow: 0 18px 34px rgba(15, 94, 89, 0.22);
      cursor: pointer;
      transition:
        transform 160ms ease,
        box-shadow 160ms ease,
        opacity 160ms ease;
      letter-spacing: 0.01em;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 22px 42px rgba(15, 94, 89, 0.26);
    }

    button:focus-visible {
      outline: none;
      box-shadow:
        0 0 0 4px rgba(15, 94, 89, 0.16),
        0 18px 34px rgba(15, 94, 89, 0.22);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 12px 20px rgba(15, 94, 89, 0.2);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.72;
    }

    button[data-size='sm'] {
      min-height: 2.6rem;
      padding: 0.55rem 0.9rem;
      border-radius: 0.8rem;
      font-size: 0.875rem;
    }

    button[data-size='md'] {
      min-height: 3rem;
      padding: 0.75rem 1rem;
      font-size: 0.95rem;
    }

    button[data-size='lg'] {
      min-height: 3.35rem;
      padding: 0.95rem 1.1rem;
      font-size: 1rem;
    }

    button[data-variant='secondary'] {
      background: linear-gradient(135deg, #334155, #1f2937);
    }

    button[data-variant='danger'] {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
    }

    button[data-variant='ghost'] {
      color: #374151;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #dbe0e8;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    button[data-variant='ghost']:hover:not(:disabled) {
      background: #f3f4f6;
      border-color: #d1d5db;
    }

    mat-spinner {
      --mat-progress-spinner-active-indicator-color: currentColor;
    }
  `],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [attr.data-variant]="variant"
      [attr.data-size]="size"
      (click)="onClick.emit($event)"
    >
      <mat-spinner *ngIf="loading" diameter="16" />
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Output() onClick = new EventEmitter<MouseEvent>();
}
