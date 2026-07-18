import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';

export const TRIBUTE_BOOK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./messages-list/messages-list.component').then((m) => m.MessagesListComponent),
    canActivate: [permissionGuard],
    data: { permissions: ['messages:read'] },
  },
  {
    path: 'history',
    loadComponent: () => import('./history/history.component').then((m) => m.HistoryComponent),
    canActivate: [permissionGuard],
    data: { permissions: ['messages:export'] },
  },
];
