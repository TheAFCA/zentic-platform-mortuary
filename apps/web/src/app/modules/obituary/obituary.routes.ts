import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';

export const OBITUARY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./obituaries-list/obituaries-list.component').then((m) => m.ObituariesListComponent),
    canActivate: [permissionGuard],
    data: { permissions: ['obituary:read'] },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./obituary-detail/obituary-detail.component').then((m) => m.ObituaryDetailComponent),
    canActivate: [permissionGuard],
    data: { permissions: ['obituary:read'] },
  },
];
