import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';

export const LEADS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./leads-list/leads-list.component').then(m => m.LeadsListComponent),
    canActivate: [permissionGuard],
    data: { permissions: ['leads:read'] },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./lead-detail/lead-detail.component').then(m => m.LeadDetailComponent),
    canActivate: [permissionGuard],
    data: { permissions: ['leads:read'] },
  },
];
