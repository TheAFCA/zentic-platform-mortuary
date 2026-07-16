import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-share-buttons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './share-buttons.component.html',
  styleUrl: './share-buttons.component.scss',
})
export class ShareButtonsComponent {
  @Input({ required: true }) shareMessage!: string;
  @Input({ required: true }) pageUrl!: string;
  /** Usado en el subject del mailto, ej. nombre del difunto o título del evento. */
  @Input({ required: true }) title!: string;

  readonly copied = signal(false);

  get whatsappUrl(): string {
    return `https://wa.me/?text=${encodeURIComponent(this.shareMessage)}`;
  }

  get mailtoUrl(): string {
    const subject = encodeURIComponent(`En memoria de ${this.title}`);
    const body = encodeURIComponent(this.shareMessage);
    return `mailto:?subject=${subject}&body=${body}`;
  }

  copyLink(): void {
    void navigator.clipboard.writeText(this.pageUrl);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
