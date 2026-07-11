import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { tenantLoginGuard } from './core/guards/tenant-login.guard';
import { UserRole } from '@zentic/shared-types';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/admin/dashboard',
    pathMatch: 'full',
  },

  // Public event page (no auth required)
  {
    path: 'e/:slug',
    loadComponent: () =>
      import('./public/event-page/event-page.component').then((m) => m.EventPageComponent),
  },

  // Public obituary page (no auth required)
  {
    path: 'o/:slug',
    loadComponent: () =>
      import('./public/obituary-page/obituary-page.component').then((m) => m.ObituaryPageComponent),
  },

  // Auth module (no layout wrapper needed)
  {
    path: 'auth',
    canMatch: [tenantLoginGuard],
    loadChildren: () => import('./modules/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Tenant admin panel
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () => import('./modules/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  // Super admin section (public login + protected panel)
  {
    path: 'super-admin',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./modules/super-admin/login/login.component').then(
            (m) => m.SuperAdminLoginComponent,
          ),
      },
      {
        path: '',
        canActivate: [authGuard, permissionGuard],
        data: { role: UserRole.SUPER_ADMIN },
        loadChildren: () =>
          import('./modules/super-admin/super-admin.routes').then((m) => m.SUPER_ADMIN_ROUTES),
      },
    ],
  },

  // Bootstrap de una sesión de impersonación de Super Admin (Módulo 04) — sin authGuard,
  // ya que la identidad llega vía token en el query param, no vía cookie de sesión.
  {
    path: 'impersonate',
    loadComponent: () =>
      import('./public/impersonate-entry/impersonate-entry.component').then(
        (m) => m.ImpersonateEntryComponent,
      ),
  },
  {
    path: 'impersonate/ended',
    loadComponent: () =>
      import('./public/impersonate-ended/impersonate-ended.component').then(
        (m) => m.ImpersonateEndedComponent,
      ),
  },

  // Destino de permissionGuard / errorInterceptor cuando falta un permiso (HU-RBAC-002)
  {
    path: 'no-autorizado',
    loadComponent: () =>
      import('./public/no-autorizado/no-autorizado.component').then((m) => m.NoAutorizadoComponent),
  },

  // Wildcard
  { path: '**', redirectTo: '/admin/dashboard' },
];
