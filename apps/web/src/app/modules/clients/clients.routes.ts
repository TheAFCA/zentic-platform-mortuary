import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';

export const CLIENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./clients.component').then((m) => m.ClientsComponent),
    canActivate: [permissionGuard],
    data: { permissions: ['clients:read'] },
  },
];
