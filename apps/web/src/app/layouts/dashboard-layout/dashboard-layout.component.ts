import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Permission } from '@zentic/shared-types';
import { ImpersonationSessionService } from '../../core/services/impersonation-session.service';
import { ImpersonationApiService } from '../../core/services/impersonation-api.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { PendingMessagesBadgeService } from '../../core/services/pending-messages-badge.service';
import { AdminSettingsApiService } from '../../core/services/admin-settings-api.service';
import { BrandThemeService } from '../../core/services/brand-theme.service';
import { ImpersonationBannerComponent } from '../../shared/organisms/impersonation-banner/impersonation-banner.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  permission?: Permission;
  /** Conteo reactivo mostrado como badge junto al label (ej: mensajes pendientes). */
  badgeCount?: () => number;
}

interface NavSection {
  title: string;
  items: NavItem[];
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
    MatButtonModule,
    MatMenuModule,
    ImpersonationBannerComponent,
    HasPermissionDirective,
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent {
  protected readonly router = inject(Router);
  protected readonly impersonationSession = inject(ImpersonationSessionService);
  protected readonly pendingMessagesBadge = inject(PendingMessagesBadgeService);
  private readonly impersonationApi = inject(ImpersonationApiService);
  private readonly authState = inject(AuthStateService);
  private readonly settingsApi = inject(AdminSettingsApiService);
  private readonly brandTheme = inject(BrandThemeService);

  constructor() {
    // El badge de mensajes pendientes es del Libro de Homenajes, tenant-scoped: para
    // SUPER_ADMIN (sin tenantId) el backend responde 403 y el errorInterceptor global
    // redirige a /no-autorizado como efecto secundario, aunque la página cargue bien.
    if (this.authState.currentUser()?.tenantId) {
      this.pendingMessagesBadge.start();

      this.settingsApi.getBrand().subscribe({
        next: (brand) => this.brandTheme.apply(brand),
        // Si falla, la app se queda con los --brand-* por defecto de styles.scss.
        error: () => undefined,
      });
    }
  }

  protected readonly superAdminNavItems: NavItem[] = [
    { path: '/super-admin/dashboard', label: 'Dashboard', icon: 'insights' },
    { path: '/super-admin/tenants', label: 'Tenants', icon: 'domain' },
    { path: '/super-admin/audit-logs', label: 'Audit Logs', icon: 'fact_check' },
    { path: '/super-admin/admins', label: 'Super Admins', icon: 'admin_panel_settings' },
  ];

  protected readonly tenantAdminNavSections: NavSection[] = [
    {
      title: 'Panel',
      items: [
        {
          path: '/admin/dashboard',
          label: 'Dashboard',
          icon: 'insights',
          permission: 'analytics:read',
        },
      ],
    },
    {
      title: 'Gestión',
      items: [
        {
          path: '/admin/obituaries',
          label: 'Obituarios',
          icon: 'article',
          permission: 'obituary:read',
        },
        {
          path: '/admin/streaming',
          label: 'Streaming',
          icon: 'live_tv',
          permission: 'streaming:read',
        },
        {
          path: '/admin/invitations',
          label: 'Invitaciones',
          icon: 'mail',
          permission: 'invitations:read',
        },
        {
          path: '/admin/tribute-book',
          label: 'Libro de Homenajes',
          icon: 'auto_stories',
          permission: 'messages:read',
          badgeCount: () => this.pendingMessagesBadge.count(),
        },
        {
          path: '/admin/clientes',
          label: 'Clientes',
          icon: 'people',
          permission: 'clients:read',
        },
        {
          path: '/admin/leads',
          label: 'Leads',
          icon: 'campaign',
          permission: 'leads:read',
        },
        {
          path: '/admin/sedes',
          label: 'Sedes',
          icon: 'domain',
          permission: 'venues:read',
        },
      ],
    },
    {
      title: 'Administración',
      items: [
        {
          path: '/admin/users',
          label: 'Usuarios',
          icon: 'group',
          permission: 'users:read',
        },
        {
          path: '/admin/descargas',
          label: 'Descargas',
          icon: 'download',
          permission: 'downloads:access',
        },
      ],
    },
    {
      title: 'Configuración del sitio',
      items: [
        {
          path: '/admin/settings/marca',
          label: 'Marca',
          icon: 'palette',
          permission: 'settings:read',
        },
        {
          path: '/admin/settings/cuenta',
          label: 'Cuenta',
          icon: 'settings_applications',
          permission: 'settings:read',
        },
        {
          path: '/admin/settings/streaming',
          label: 'Streaming',
          icon: 'live_tv',
          permission: 'settings:read',
        },
      ],
    },
    {
      title: 'Mi cuenta',
      items: [
        {
          path: '/admin/mi-cuenta',
          label: 'Contraseña y acceso',
          icon: 'lock',
          permission: 'settings:read',
        },
      ],
    },
  ];

  protected readonly expandedSections = signal<Record<string, boolean>>({
    Panel: true,
    Gestión: true,
    Administración: true,
    'Configuración del sitio': true,
    'Mi cuenta': true,
  });

  protected toggleSection(title: string): void {
    this.expandedSections.update((state) => ({
      ...state,
      [title]: !state[title],
    }));
  }

  get isSuperAdmin(): boolean {
    return this.router.url.startsWith('/super-admin');
  }

  get userEmail(): string {
    return this.authState.currentUser()?.email ?? '';
  }

  logout(): void {
    this.authState.clear();
    void this.router.navigate(['/auth/login']);
  }

  exitImpersonation(): void {
    const session = this.impersonationSession.session();
    this.impersonationSession.end();
    if (session) {
      this.impersonationApi.end(session.impersonationLogId).subscribe();
    }
    void this.router.navigate(['/impersonate/ended']);
  }
}
