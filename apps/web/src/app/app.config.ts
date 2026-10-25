import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { createErrorHandler } from '@sentry/angular';
import { routes } from './app.routes';
import { tenantContextInterceptor } from './core/interceptors/tenant-context.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { sessionInterceptor } from './core/interceptors/session.interceptor';
import { impersonationInterceptor } from './core/interceptors/impersonation.interceptor';
import { AuthSessionService } from './core/services/auth-session.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: ErrorHandler,
      useValue: createErrorHandler({ showDialog: false }),
    },
    provideAppInitializer(() => inject(AuthSessionService).restoreSession()),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        impersonationInterceptor,
        tenantContextInterceptor,
        authInterceptor,
        errorInterceptor,
        sessionInterceptor,
      ]),
    ),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    providePrimeNG({ theme: { preset: Aura } }),
  ],
};
