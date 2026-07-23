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
  styles: [
    `
      :host {
        display: block;
      }

      button {
        width: 100%;
        min-height: 3.25rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        border: 0;
        border-radius: var(--radius-md, 0.85rem);
        padding: 0.75rem 1rem;
        font-weight: 600;
        font-size: 0.92rem;
        color: #fff;
        background: linear-gradient(
          135deg,
          var(--brand-primary, #0f5e59),
          var(--brand-primary-hover, #0b4c48)
        );
        box-shadow: 0 12px 24px rgba(15, 94, 89, 0.2);
        cursor: pointer;
        transition:
          transform 150ms ease,
          box-shadow 150ms ease,
          opacity 150ms ease;
        letter-spacing: 0.01em;
      }

      button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 16px 30px rgba(15, 94, 89, 0.26);
      }

      button:focus-visible {
        outline: none;
        box-shadow:
          0 0 0 4px rgba(15, 94, 89, 0.16),
          0 12px 24px rgba(15, 94, 89, 0.2);
      }

      button:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 8px 16px rgba(15, 94, 89, 0.2);
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      button[data-size='sm'] {
        min-height: 2.25rem;
        padding: 0.4rem 0.75rem;
        border-radius: 0.65rem;
        font-size: 0.85rem;
        gap: 0.4rem;
      }

      button[data-size='md'] {
        min-height: 2.75rem;
        padding: 0.6rem 1rem;
        font-size: 0.92rem;
      }

      button[data-size='lg'] {
        min-height: 3.25rem;
        padding: 0.75rem 1.25rem;
        font-size: 1rem;
      }

      button[data-variant='secondary'] {
        background: linear-gradient(135deg, #334155, #1f2937);
      }

      button[data-variant='danger'] {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
      }

      button[data-variant='ghost'] {
        color: var(--ink, #374151);
        background: #fff;
        border: 1px solid var(--border, #e7e9ee);
        box-shadow: var(--shadow-xs, 0 1px 2px rgba(15, 23, 42, 0.04));
      }

      button[data-variant='ghost']:hover:not(:disabled) {
        background: var(--surface, #f9fafb);
        border-color: var(--border-dark, #d1d5db);
      }

      mat-spinner {
        --mat-progress-spinner-active-indicator-color: currentColor;
      }
    `,
  ],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [attr.aria-busy]="loading"
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
