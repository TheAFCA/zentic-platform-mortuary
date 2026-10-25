import {
  HttpBackend,
  HttpClient,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthUser } from '@zentic/shared-types';
import { AuthStateService } from '../services/auth-state.service';
import { ImpersonationSessionService } from '../services/impersonation-session.service';
import { environment } from '../../../environments/environment';
import { getTenantSlug } from './tenant-context.interceptor';

export const SKIP_SESSION_REFRESH = new HttpContextToken<boolean>(() => false);

const isAuthEndpoint = (url: string) =>
  url.includes('/auth/login') ||
  url.includes('/auth/refresh') ||
  url.includes('/auth/logout') ||
  url.includes('/auth/forgot-password') ||
  url.includes('/auth/reset-password') ||
  url.includes('/auth/change-password');

/** Solo un rechazo real de la sesión justifica cerrarla; caídas de red o 5xx no. */
const isSessionRejected = (error: unknown): boolean =>
  error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);

/**
 * Refresh compartido: cuando vence el access token, varias peticiones en vuelo
 * (polling del dashboard, badge de mensajes, etc.) reciben 401 a la vez. Todas
 * esperan el mismo refresh en lugar de lanzar uno cada una.
 */
let refreshInFlight$: Observable<AuthUser> | null = null;

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

      if (!refreshInFlight$) {
        // refreshClient usa HttpBackend y se salta tenantContextInterceptor, así que el
        // header del tenant se agrega acá; sin él el backend dependía de PLATFORM_DOMAIN
        // para resolver el tenant y, si no coincidía, cada refresh fallaba.
        const tenantSlug = getTenantSlug();
        refreshInFlight$ = refreshClient
          .post<AuthUser>(
            `${environment.apiUrl}/auth/refresh`,
            {},
            {
              withCredentials: true,
              headers: tenantSlug ? { 'x-tenant-slug': tenantSlug } : {},
            },
          )
          .pipe(
            finalize(() => {
              refreshInFlight$ = null;
            }),
            shareReplay({ bufferSize: 1, refCount: false }),
          );
      }

      return refreshInFlight$.pipe(
        catchError((refreshError: unknown) => {
          if (isSessionRejected(refreshError)) {
            authState.clear();
            void router.navigate(['/auth/login']);
            return throwError(() => new HttpErrorResponse({ error: refreshError, status: 401 }));
          }
          // API caída/reiniciándose o error de red: la sesión sigue siendo válida, no
          // se cierra. Se propaga el error del refresh (no el 401 original) para que
          // errorInterceptor no lo trate como sesión expirada.
          return throwError(() => refreshError);
        }),
        switchMap((user) => {
          authState.setUser(user);
          const retryRequest = request.clone({
            context: request.context.set(SKIP_SESSION_REFRESH, true),
          });

          return next(retryRequest);
        }),
      );
    }),
  );
};
