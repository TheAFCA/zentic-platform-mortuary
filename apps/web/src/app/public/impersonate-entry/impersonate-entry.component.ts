import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../../core/services/auth-api.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ImpersonationSessionService } from '../../core/services/impersonation-session.service';

@Component({
  selector: 'app-impersonate-entry',
  standalone: true,
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <p class="text-gray-600">{{ error() || 'Iniciando sesión de soporte…' }}</p>
    </div>
  `,
})
export class ImpersonateEntryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly impersonationSession = inject(ImpersonationSessionService);

  readonly error = signal('');

  ngOnInit(): void {
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const token = params.get('token');
    const tenantSlug = params.get('tenantSlug');
    const tenantName = params.get('tenantName');
    const expiresAt = params.get('expiresAt');
    const logId = params.get('logId');

    if (!token || !tenantSlug || !tenantName || !expiresAt || !logId) {
      this.error.set('Enlace de impersonación inválido.');
      return;
    }

    this.impersonationSession.start({
      token,
      tenantSlug,
      tenantName,
      expiresAt,
      impersonationLogId: logId,
    });

    try {
      const user = await firstValueFrom(this.authApi.me());
      this.authState.setUser(user);
      await this.router.navigate(['/admin/dashboard']);
    } catch {
      this.impersonationSession.end();
      this.error.set('No se pudo iniciar la sesión de soporte.');
    }
  }
}
