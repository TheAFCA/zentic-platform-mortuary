import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { TenantModuleKey } from '@zentic/shared-types';
import { AuthStateService } from '../../core/services/auth-state.service';

/**
 * *appHasModule="'leads'" quita el nodo del DOM cuando el tenant no tiene ese módulo habilitado
 * (Super Admin → control de acceso por tenant, segundo nivel por encima de *appHasPermission).
 * `null`/`undefined` significa "módulo siempre activo" (Dashboard, Usuarios, Marca, Cuenta) —
 * no se restringe. Usa AuthStateService.hasModule() como única fuente de verdad.
 */
@Directive({
  selector: '[appHasModule]',
  standalone: true,
})
export class HasModuleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authState = inject(AuthStateService);

  private required: TenantModuleKey | null = null;
  private hasView = false;

  @Input()
  set appHasModule(value: TenantModuleKey | null | undefined) {
    this.required = value ?? null;
    this.updateView();
  }

  constructor() {
    effect(() => this.updateView());
  }

  private updateView(): void {
    const authorized = this.required === null || this.authState.hasModule(this.required);

    if (authorized && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!authorized && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
