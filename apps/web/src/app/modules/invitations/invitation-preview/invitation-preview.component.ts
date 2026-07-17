import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InvitationTemplate, TenantBrandConfig } from '@zentic/shared-types';
import { InitialsAvatarComponent } from '../../../shared/atoms/initials-avatar/initials-avatar.component';

/**
 * Aproximación visual en HTML/CSS de las 3 plantillas SVG que el backend rasteriza a PNG
 * (ver invitations/renderers/*.renderer.ts). No es pixel-perfecta con el render del servidor —
 * usa el mismo mapeo de colores de marca (primary/secondary/text/background) para dar una idea
 * fiel del resultado mientras el operador edita (RF-INV-003).
 */
@Component({
  selector: 'app-invitation-preview',
  standalone: true,
  imports: [CommonModule, InitialsAvatarComponent],
  templateUrl: './invitation-preview.component.html',
  styleUrl: './invitation-preview.component.scss',
})
export class InvitationPreviewComponent {
  @Input() template: InvitationTemplate = InvitationTemplate.CLASSIC;
  @Input() brand: TenantBrandConfig | null = null;
  @Input() firstName = '';
  @Input() lastName = '';
  @Input() photoUrl: string | null = null;
  @Input() scheduledAt: string | null = null;
  @Input() venueName: string | null = null;
  @Input() roomName: string | null = null;
  @Input() address: string | null = null;
  @Input() message = '';
  @Input() accessCodeDisplay: string | null = null;

  get templateClass(): string {
    return `invitation-preview--${this.template.toLowerCase()}`;
  }

  get brandStyle(): Record<string, string> {
    return {
      '--invitation-primary': this.brand?.primaryColor ?? '#1a1a2e',
      '--invitation-secondary': this.brand?.secondaryColor ?? '#16213e',
      '--invitation-text': this.brand?.textColor ?? '#333333',
      '--invitation-background': this.brand?.backgroundColor ?? '#f5f5f5',
    };
  }

  get placeLabel(): string {
    if (!this.venueName) return '';
    return this.roomName ? `${this.venueName} — ${this.roomName}` : this.venueName;
  }

  get addressLabel(): string {
    // Caso borde §13: sin lugar asignado o sin dirección, se muestra el mismo fallback.
    return this.address ?? 'Dirección por confirmar';
  }
}
