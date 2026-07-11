import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ImpersonationSessionService } from '../services/impersonation-session.service';

export const impersonationInterceptor: HttpInterceptorFn = (req, next) => {
  const impersonationSession = inject(ImpersonationSessionService);
  const token = impersonationSession.getToken();

  if (!token || !req.url.startsWith('/api')) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
