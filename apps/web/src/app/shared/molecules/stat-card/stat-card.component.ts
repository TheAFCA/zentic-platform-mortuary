import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">{{ label }}</p>
          <p class="mt-1 text-3xl font-semibold text-gray-900">{{ value }}</p>
          <p *ngIf="subtitle" class="mt-1 text-sm text-gray-500">{{ subtitle }}</p>
        </div>
        <div *ngIf="icon" class="rounded-full bg-primary/10 p-3">
          <mat-icon class="text-primary">{{ icon }}</mat-icon>
        </div>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() subtitle = '';
  @Input() icon = '';
}
