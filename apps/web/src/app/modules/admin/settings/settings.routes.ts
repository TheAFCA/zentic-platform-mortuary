import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/guards/permission.guard';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./settings.component').then((m) => m.SettingsComponent),
    children: [
      {
        path: 'seguridad',
        loadComponent: () =>
          import('./security-settings/security-settings.component').then(
            (m) => m.SecuritySettingsComponent,
          ),
      },
      {
        path: 'marca',
        canActivate: [permissionGuard],
        data: { permissions: ['settings:manage'] },
        loadComponent: () =>
          import('./brand-settings/brand-settings.component').then((m) => m.BrandSettingsComponent),
      },
      {
        path: 'cuenta',
        canActivate: [permissionGuard],
        data: { permissions: ['settings:manage'] },
        loadComponent: () =>
          import('./account-settings/account-settings.component').then(
            (m) => m.AccountSettingsComponent,
          ),
      },
      {
        path: 'streaming',
        canActivate: [permissionGuard],
        data: { permissions: ['settings:read'] },
        loadComponent: () =>
          import('./streaming-settings/streaming-settings.component').then(
            (m) => m.StreamingSettingsComponent,
          ),
      },
      { path: '', redirectTo: 'seguridad', pathMatch: 'full' },
    ],
  },
];
