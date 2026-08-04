import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { A11yModule } from '@angular/cdk/a11y';

/**
 * Panel deslizable desde la derecha para flujos de "Nuevo X" / "Editar X" que antes
 * empujaban el listado hacia abajo. Reusa el mismo blur de fondo que ConfirmDialogComponent
 * para mantener un único lenguaje de overlay en toda la app.
 *
 * A diferencia de ConfirmDialogComponent, aquí NO hay un `open` @Input con `*ngIf` interno:
 * el contenido proyectado (`<ng-content>`) son formularios reales con su propio `ngOnInit`
 * (llamadas HTTP incluidas), y Angular crea el contenido proyectado como parte de la vista
 * del PADRE — un `*ngIf` interno en este componente no evita que esos formularios se
 * instancien y disparen sus llamadas apenas se renderiza `<app-form-panel>`, sin importar
 * si `open` es true o false. La existencia del panel (vía `*ngIf` en el componente padre)
 * es la única señal de ciclo de vida válida aquí.
 */
@Component({
  selector: 'app-form-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, A11yModule],
  styles: [
    `
      :host {
        display: contents;
      }

      .form-panel__backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        backdrop-filter: blur(6px);
        display: flex;
        justify-content: flex-end;
        z-index: 1000;
        animation: formPanelFadeIn 150ms ease-out;
      }

      @keyframes formPanelFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .form-panel__panel {
        width: min(34rem, 100vw);
        height: 100dvh;
        background: var(--surface-alt, #fff);
        box-shadow: -24px 0 64px rgba(15, 23, 42, 0.22);
        display: flex;
        flex-direction: column;
        animation: formPanelSlideIn 220ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes formPanelSlideIn {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }

      .form-panel__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.5rem 1.5rem 1.25rem;
        border-bottom: 1px solid var(--border, #e7e9ee);
        flex: 0 0 auto;
      }

      .form-panel__header h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.3rem;
        font-weight: 500;
        color: var(--ink, #1f2937);
      }

      .form-panel__close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.65rem;
        border: 1px solid var(--border, #e7e9ee);
        background: #fff;
        color: var(--ink-secondary, #6b7280);
        cursor: pointer;
        flex: 0 0 auto;
        transition:
          background-color 150ms ease,
          border-color 150ms ease;
      }

      .form-panel__close:hover {
        background: var(--surface, #f9fafb);
      }

      .form-panel__close:focus-visible {
        outline: none;
        box-shadow: 0 0 0 4px var(--brand-primary-light, rgba(15, 94, 89, 0.1));
      }

      .form-panel__body {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 1.5rem;
        // Permite que formularios con layouts multi-columna (ej. invitation-form,
        // pensados originalmente para el ancho completo de .panel-card) reaccionen
        // al ancho real y angosto del panel en vez del viewport completo.
        container-type: inline-size;
      }

      @media (max-width: 640px) {
        .form-panel__panel {
          width: 100vw;
        }
      }
    `,
  ],
  template: `
    <div class="form-panel__backdrop" (click)="onBackdropClick()" (keydown.escape)="onClose()">
      <aside
        class="form-panel__panel"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        data-testid="form-panel"
      >
        <header class="form-panel__header">
          <h2>{{ title }}</h2>
          <button
            type="button"
            class="form-panel__close"
            (click)="onClose()"
            aria-label="Cerrar"
            data-testid="form-panel-close"
          >
            <mat-icon>close</mat-icon>
          </button>
        </header>
        <div class="form-panel__body">
          <ng-content />
        </div>
      </aside>
    </div>
  `,
})
export class FormPanelComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);

  @Input() title = '';
  @Output() closed = new EventEmitter<void>();

  constructor() {
    this.document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = '';
  }

  onClose(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    this.onClose();
  }
}
