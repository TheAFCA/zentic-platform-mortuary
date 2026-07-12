import { Routes } from '@angular/router';

export const SUPER_ADMIN_ROUTES: Routes = [
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
          import('./dashboard/dashboard.component').then((m) => m.SuperAdminDashboardComponent),
      },
      {
        path: 'tenants',
        loadComponent: () => import('./tenants/tenants.component').then((m) => m.TenantsComponent),
      },
      {
        path: 'audit-logs',
        loadComponent: () =>
          import('./audit-logs/audit-logs.component').then((m) => m.AuditLogsComponent),
      },
      {
        path: 'admins',
        loadComponent: () =>
          import('./admins/admins.component').then((m) => m.SuperAdminAdminsComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
