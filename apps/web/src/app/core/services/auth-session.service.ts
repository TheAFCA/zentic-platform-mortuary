import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthUser, UserRole } from '@zentic/shared-types';
import { AuthApiService } from './auth-api.service';
import { AuthStateService } from './auth-state.service';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authApi = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  async restoreSession(): Promise<void> {
    const user = await firstValueFrom(this.authApi.me().pipe(catchError(() => of(null))));

    this.authState.setUser(user);
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const user = await firstValueFrom(this.authApi.login(email, password));
    this.authState.setUser(user);
    await this.router.navigate([this.getHomeRoute(user)]);
    return user;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.authApi.logout());
    } finally {
      this.authState.clear();
      await this.router.navigate(['/auth/login']);
    }
  }

  async refreshSession(): Promise<AuthUser | null> {
    try {
      const user = await firstValueFrom(this.authApi.refresh());
      this.authState.setUser(user);
      return user;
    } catch {
      this.authState.clear();
      return null;
    }
  }

  private getHomeRoute(user: AuthUser) {
    return user.role === UserRole.SUPER_ADMIN ? '/super-admin/tenants' : '/admin/dashboard';
  }
}
