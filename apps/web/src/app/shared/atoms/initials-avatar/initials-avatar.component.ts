import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

const PALETTE = [
  '#0f5e59',
  '#7c3aed',
  '#be123c',
  '#0369a1',
  '#b45309',
  '#4d7c0f',
  '#9d174d',
  '#334155',
];

@Component({
  selector: 'app-initials-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './initials-avatar.component.html',
  styleUrl: './initials-avatar.component.scss',
})
export class InitialsAvatarComponent {
  @Input() firstName = '';
  @Input() lastName = '';
  @Input() sizePx = 48;

  get initials(): string {
    const first = this.firstName.trim().charAt(0);
    const last = this.lastName.trim().charAt(0);
    const initials = `${first}${last}`.toUpperCase();
    return initials || '?';
  }

  get backgroundColor(): string {
    const key = `${this.firstName}${this.lastName}`;
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
  }
}
