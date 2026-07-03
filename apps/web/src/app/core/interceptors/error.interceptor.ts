import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from '../services/auth-state.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authState = inject(AuthStateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authState.clear();
        localStorage.removeItem('access_token');
        router.navigate(['/auth/login']);
      }
      if (error.status === 403) {
        router.navigate(['/admin/dashboard']);
      }
      return throwError(() => error);
    }),
  );
};
