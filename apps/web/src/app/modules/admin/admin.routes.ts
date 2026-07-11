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
        path: 'users',
        canActivate: [permissionGuard],
        data: { permissions: ['users:read'] },
        loadComponent: () => import('./users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/settings.component').then((m) => m.SettingsComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
