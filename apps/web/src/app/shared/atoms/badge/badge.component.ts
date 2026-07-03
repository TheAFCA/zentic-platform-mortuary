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
    const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
    const colors: Record<BadgeColor, string> = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
      blue: 'bg-blue-100 text-blue-800',
      gray: 'bg-gray-100 text-gray-800',
    };
    return `${base} ${colors[this.color]}`;
  }
}
