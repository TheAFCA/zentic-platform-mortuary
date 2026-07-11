import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ImpersonationSessionService } from '../../core/services/impersonation-session.service';
import { ImpersonationApiService } from '../../core/services/impersonation-api.service';
import { ImpersonationBannerComponent } from '../../shared/organisms/impersonation-banner/impersonation-banner.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    ImpersonationBannerComponent,
  ],
  template: `
    <app-impersonation-banner
      *ngIf="impersonationSession.isActive()"
      [tenantName]="impersonationSession.session()!.tenantName"
      [expiresAt]="impersonationSession.session()!.expiresAt"
      (exit)="exitImpersonation()"
      (expired)="exitImpersonation()"
    />

    <mat-sidenav-container class="h-screen">
      <mat-sidenav mode="side" opened class="w-64 bg-secondary">
        <!-- TODO: SidebarComponent — implement in Module 05 -->
        <div class="p-4 text-white">
          <h2 class="font-bold text-lg">ZENTIC</h2>
        </div>
        <!-- Navegación temporal del panel Super Admin (Módulo 04) — el sidebar real es de Módulo 05 -->
        <nav class="px-2" *ngIf="router.url.startsWith('/super-admin')">
          <a
            class="block text-white/80 hover:text-white px-2 py-2 text-sm"
            routerLink="/super-admin/dashboard"
            >Dashboard</a
          >
          <a
            class="block text-white/80 hover:text-white px-2 py-2 text-sm"
            routerLink="/super-admin/tenants"
            >Tenants</a
          >
          <a
            class="block text-white/80 hover:text-white px-2 py-2 text-sm"
            routerLink="/super-admin/audit-logs"
            >Audit Logs</a
          >
          <a
            class="block text-white/80 hover:text-white px-2 py-2 text-sm"
            routerLink="/super-admin/admins"
            >Super Admins</a
          >
        </nav>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar class="bg-white border-b border-gray-200 shadow-sm">
          <!-- TODO: HeaderComponent — implement in Module 05 -->
        </mat-toolbar>
        <main class="p-6 bg-gray-50 min-h-full">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class DashboardLayoutComponent {
  protected readonly router = inject(Router);
  protected readonly impersonationSession = inject(ImpersonationSessionService);
  private readonly impersonationApi = inject(ImpersonationApiService);

  exitImpersonation(): void {
    const session = this.impersonationSession.session();
    this.impersonationSession.end();
    if (session) {
      this.impersonationApi.end(session.impersonationLogId).subscribe();
    }
    void this.router.navigate(['/impersonate/ended']);
  }
}
