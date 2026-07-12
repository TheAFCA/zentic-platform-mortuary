import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';

export const VENUES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./venues.component').then((m) => m.VenuesComponent),
    canActivate: [permissionGuard],
    data: { permissions: ['venues:read'] },
  },
];
