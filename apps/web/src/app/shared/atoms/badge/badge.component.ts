import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses">
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  @Input() color: BadgeColor = 'gray';

  get badgeClasses(): string {
    const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide';
    const colors: Record<BadgeColor, string> = {
      green: 'bg-green-50 text-green-700 border border-green-200',
      yellow: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      red: 'bg-red-50 text-red-700 border border-red-200',
      blue: 'bg-blue-50 text-blue-700 border border-blue-200',
      gray: 'bg-gray-50 text-gray-600 border border-gray-200',
    };
    return `${base} ${colors[this.color]}`;
  }
}
