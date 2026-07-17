import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';

export const INVITATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./invitations-list/invitations-list.component').then(
        (m) => m.InvitationsListComponent,
      ),
    canActivate: [permissionGuard],
    data: { permissions: ['invitations:read'] },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./invitation-detail/invitation-detail.component').then(
        (m) => m.InvitationDetailComponent,
      ),
    canActivate: [permissionGuard],
    data: { permissions: ['invitations:read'] },
  },
];
