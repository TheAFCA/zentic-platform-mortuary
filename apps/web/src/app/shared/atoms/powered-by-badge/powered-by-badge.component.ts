import { Component } from '@angular/core';

/**
 * Marca de agua discreta para páginas públicas (evento/obituario) — crédito de
 * la plataforma, no interactivo, no bloquea clics ni scroll del contenido debajo.
 */
@Component({
  selector: 'app-powered-by-badge',
  standalone: true,
  template: `<span class="powered-by-badge">Created by ZENTIC.pro</span>`,
  styles: `
    .powered-by-badge {
      position: fixed;
      bottom: 0.75rem;
      right: 0.75rem;
      z-index: 40;
      background: rgba(0, 0, 0, 0.55);
      color: rgba(255, 255, 255, 0.85);
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.01em;
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      backdrop-filter: blur(4px);
      pointer-events: none;
      user-select: none;
    }
  `,
})
export class PoweredByBadgeComponent {}
