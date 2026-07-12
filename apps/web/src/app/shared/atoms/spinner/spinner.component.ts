import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      ::ng-deep mat-spinner {
        --mat-progress-spinner-active-indicator-color: var(--brand-primary, #0f5e59);
      }
    `,
  ],
  template: `<mat-spinner [diameter]="diameter" />`,
})
export class SpinnerComponent {
  @Input() diameter = 40;
}
