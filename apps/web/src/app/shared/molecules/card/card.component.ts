import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      :host {
        display: block;
      }

      .card {
        border-radius: var(--radius-xl, 1.25rem);
        background: var(--surface-alt, #fff);
        box-shadow: var(--shadow-card, 0 12px 32px rgba(17, 24, 39, 0.06));
        border: 1px solid var(--border, #e7e9ee);
        transition:
          box-shadow 200ms ease,
          transform 200ms ease;
      }

      .card:hover {
        box-shadow: var(--shadow-card-hover, 0 20px 48px rgba(17, 24, 39, 0.1));
      }

      .card__header {
        padding: 1.25rem 1.5rem 0.75rem;
      }

      .card__title {
        margin: 0;
        font-family: var(--font-display, inherit);
        font-weight: 500;
        font-size: 1.05rem;
        color: var(--ink, #1f2937);
        letter-spacing: 0;
      }

      .card__body {
        padding: 1.25rem 1.5rem;
      }

      .card__footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border-light, #f1f3f6);
        background: var(--surface, #fafbfc);
        border-radius: 0 0 var(--radius-xl, 1.25rem) var(--radius-xl, 1.25rem);
      }
    `,
  ],
  template: `
    <div class="card">
      <div *ngIf="title" class="card__header">
        <h3 class="card__title">{{ title }}</h3>
      </div>
      <div class="card__body">
        <ng-content />
      </div>
      <div *ngIf="hasFooter" class="card__footer">
        <ng-content select="[card-footer]" />
      </div>
    </div>
  `,
})
export class CardComponent {
  @Input() title = '';
  @Input() hasFooter = false;
}
