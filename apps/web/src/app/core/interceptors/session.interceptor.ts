import {
  HttpBackend,
  HttpClient,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthUser } from '@zentic/shared-types';
import { AuthStateService } from '../services/auth-state.service';
import { ImpersonationSessionService } from '../services/impersonation-session.service';
import { environment } from '../../../environments/environment';

export const SKIP_SESSION_REFRESH = new HttpContextToken<boolean>(() => false);

const isAuthEndpoint = (url: string) =>
  url.includes('/auth/login') ||
  url.includes('/auth/refresh') ||
  url.includes('/auth/logout') ||
  url.includes('/auth/forgot-password') ||
  url.includes('/auth/reset-password') ||
  url.includes('/auth/change-password');

export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authState = inject(AuthStateService);
  const impersonationSession = inject(ImpersonationSessionService);
  const refreshClient = new HttpClient(inject(HttpBackend));

  const request = req.clone({ withCredentials: true });

  if (request.context.get(SKIP_SESSION_REFRESH)) {
    return next(request);
  }

  // Las sesiones de impersonación (Módulo 04 — Super Admin) no tienen refresh token:
  // su expiración de 30 minutos es intencional, así que no se intenta el refresh
  // silencioso — el 401 se deja pasar y errorInterceptor cierra la sesión.
  if (impersonationSession.isActive()) {
    return next(request);
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint(request.url)) {
        return throwError(() => error);
      }

      return refreshClient
        .post<AuthUser>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
        .pipe(
          switchMap((user) => {
            authState.setUser(user);
            const retryRequest = request.clone({
              context: request.context.set(SKIP_SESSION_REFRESH, true),
            });

            return next(retryRequest);
          }),
          catchError((refreshError: unknown) => {
            authState.clear();
            void router.navigate(['/auth/login']);
            return throwError(() => new HttpErrorResponse({ error: refreshError, status: 401 }));
          }),
        );
    }),
  );
};
