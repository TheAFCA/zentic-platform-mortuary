import { Injectable, signal, computed } from '@angular/core';
import { AuthUser } from '@zentic/shared-types';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly _user = signal<AuthUser | null>(null);

  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  setUser(user: AuthUser | null) {
    this._user.set(user);
  }

  hasPermission(permission: string): boolean {
    const user = this._user();
    return user?.permissions.includes(permission as never) ?? false;
  }

  clear() {
    this._user.set(null);
  }
}
