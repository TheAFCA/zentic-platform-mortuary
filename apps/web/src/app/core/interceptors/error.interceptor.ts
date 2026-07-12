import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import * as Sentry from '@sentry/angular';
import { AuthStateService } from '../services/auth-state.service';
import { ImpersonationSessionService } from '../services/impersonation-session.service';

const isAuthEndpoint = (url: string) =>
  url.includes('/auth/login') ||
  url.includes('/auth/refresh') ||
  url.includes('/auth/logout') ||
  url.includes('/auth/me') ||
  url.includes('/auth/forgot-password') ||
  url.includes('/auth/reset-password') ||
  url.includes('/auth/change-password');

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authState = inject(AuthStateService);
  const impersonationSession = inject(ImpersonationSessionService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (impersonationSession.isActive()) {
          // No tocar authState: pertenece a la sesión real del Super Admin, no a la
          // sesión de impersonación (que no usa cookies ni ese estado).
          impersonationSession.end();
          void router.navigate(['/impersonate/ended']);
        } else if (!isAuthEndpoint(req.url)) {
          authState.clear();
          void router.navigate(['/auth/login']);
        }
      }
      if (error.status === 403) {
        if (!isAuthEndpoint(req.url)) {
          void router.navigate(['/no-autorizado']);
        }
      }
      if (error.status >= 500) {
        Sentry.captureException(error);
      }
      return throwError(() => error);
    }),
  );
};
