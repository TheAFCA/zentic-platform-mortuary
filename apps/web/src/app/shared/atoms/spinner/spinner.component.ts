import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `<mat-spinner [diameter]="diameter" />`,
})
export class SpinnerComponent {
  @Input() diameter = 40;
}
