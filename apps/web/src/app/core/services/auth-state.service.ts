import { Injectable, signal, computed } from '@angular/core';
import { AuthUser, Permission, TenantModuleKey, UserRole } from '@zentic/shared-types';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly _user = signal<AuthUser | null>(null);

  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  setUser(user: AuthUser | null) {
    this._user.set(user);
  }

  /**
   * SUPER_ADMIN/TENANT_ADMIN tienen todos los permisos de su ámbito por defecto (§4) — igual que
   * el PermissionGuard del backend, deben pasar sin depender del array `permissions`.
   */
  hasPermission(permission: Permission): boolean {
    const user = this._user();
    if (!user) return false;
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.TENANT_ADMIN) return true;
    return user.permissions.includes(permission);
  }

  /**
   * Segundo nivel de acceso, por encima de hasPermission(): a diferencia de esa, aquí NO hay
   * bypass para TENANT_ADMIN — la restricción de módulos la decide el Super Admin y aplica al
   * tenant completo, igual que TenantModuleGuard en el backend.
   */
  hasModule(module: TenantModuleKey): boolean {
    const user = this._user();
    if (!user) return false;
    if (user.role === UserRole.SUPER_ADMIN) return true;
    return user.enabledModules.includes(module);
  }

  clear() {
    this._user.set(null);
  }
}
