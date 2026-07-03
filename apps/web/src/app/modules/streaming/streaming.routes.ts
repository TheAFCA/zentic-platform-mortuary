import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';

export const STREAMING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./events-list/events-list.component').then(m => m.EventsListComponent),
    canActivate: [permissionGuard],
    data: { permissions: ['streaming:read'] },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./event-detail/event-detail.component').then(m => m.EventDetailComponent),
    canActivate: [permissionGuard],
    data: { permissions: ['streaming:read'] },
  },
];
