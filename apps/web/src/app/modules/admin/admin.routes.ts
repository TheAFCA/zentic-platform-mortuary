import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'streaming',
        loadChildren: () => import('../streaming/streaming.routes').then((m) => m.STREAMING_ROUTES),
      },
      {
        path: 'obituaries',
        loadChildren: () => import('../obituary/obituary.routes').then((m) => m.OBITUARY_ROUTES),
      },
      {
        path: 'leads',
        loadChildren: () => import('../leads/leads.routes').then((m) => m.LEADS_ROUTES),
      },
      {
        path: 'clientes',
        canActivate: [permissionGuard],
        data: { permissions: ['clients:read'] },
        loadChildren: () => import('../clients/clients.routes').then((m) => m.CLIENTS_ROUTES),
      },
      {
        path: 'sedes',
        canActivate: [permissionGuard],
        data: { permissions: ['venues:read'] },
        loadChildren: () => import('../venues/venues.routes').then((m) => m.VENUES_ROUTES),
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { permissions: ['users:read'] },
        loadComponent: () => import('./users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'descargas',
        canActivate: [permissionGuard],
        data: { permissions: ['downloads:access'] },
        loadComponent: () =>
          import('./downloads/downloads.component').then((m) => m.DownloadsComponent),
      },
      {
        path: 'mi-cuenta',
        loadComponent: () =>
          import('./settings/security-settings/security-settings.component').then(
            (m) => m.SecuritySettingsComponent,
          ),
      },
      {
        path: 'settings',
        loadChildren: () => import('./settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
