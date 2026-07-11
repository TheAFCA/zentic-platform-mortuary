import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ImpersonationSessionService } from '../../core/services/impersonation-session.service';
import { ImpersonationApiService } from '../../core/services/impersonation-api.service';
import { ImpersonationBannerComponent } from '../../shared/organisms/impersonation-banner/impersonation-banner.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatIconModule,
    MatSidenavModule,
    MatToolbarModule,
    ImpersonationBannerComponent,
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent {
  protected readonly router = inject(Router);
  protected readonly impersonationSession = inject(ImpersonationSessionService);
  private readonly impersonationApi = inject(ImpersonationApiService);

  protected readonly superAdminNavItems: NavItem[] = [
    { path: '/super-admin/dashboard', label: 'Dashboard', icon: 'insights' },
    { path: '/super-admin/tenants', label: 'Tenants', icon: 'domain' },
    { path: '/super-admin/audit-logs', label: 'Audit Logs', icon: 'fact_check' },
    { path: '/super-admin/admins', label: 'Super Admins', icon: 'admin_panel_settings' },
  ];

  exitImpersonation(): void {
    const session = this.impersonationSession.session();
    this.impersonationSession.end();
    if (session) {
      this.impersonationApi.end(session.impersonationLogId).subscribe();
    }
    void this.router.navigate(['/impersonate/ended']);
  }
}
