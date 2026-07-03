import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-lg bg-white shadow-sm border border-gray-100">
      <div *ngIf="title" class="px-6 py-4 border-b border-gray-100">
        <h3 class="text-base font-semibold text-gray-900">{{ title }}</h3>
      </div>
      <div class="p-6">
        <ng-content />
      </div>
      <div *ngIf="hasFooter" class="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <ng-content select="[card-footer]" />
      </div>
    </div>
  `,
})
export class CardComponent {
  @Input() title = '';
  @Input() hasFooter = false;
}
