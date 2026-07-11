import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { Permission } from '@zentic/shared-types';
import { AuthStateService } from '../../core/services/auth-state.service';

/**
 * *appHasPermission="'streaming:create'" (o un array, semántica OR) quita el nodo del DOM
 * cuando el usuario no tiene el/los permiso(s) — no lo oculta con CSS (HU-RBAC-002).
 * Usa AuthStateService.hasPermission() como única fuente de verdad (mismo bypass de
 * SUPER_ADMIN/TENANT_ADMIN que el guard, sin duplicar esa lógica).
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authState = inject(AuthStateService);

  private required: Permission[] = [];
  private hasView = false;

  @Input()
  set appHasPermission(value: Permission | Permission[]) {
    this.required = Array.isArray(value) ? value : [value];
    this.updateView();
  }

  constructor() {
    effect(() => this.updateView());
  }

  private updateView(): void {
    const authorized =
      this.required.length === 0 || this.required.some(permission => this.authState.hasPermission(permission));

    if (authorized && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!authorized && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
