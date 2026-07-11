import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import * as Sentry from '@sentry/angular';
import { AuthStateService } from '../services/auth-state.service';

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

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (!isAuthEndpoint(req.url)) {
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
