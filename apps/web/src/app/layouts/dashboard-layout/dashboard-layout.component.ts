import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatSidenavModule, MatToolbarModule],
  template: `
    <mat-sidenav-container class="h-screen">
      <mat-sidenav mode="side" opened class="w-64 bg-secondary">
        <!-- TODO: SidebarComponent — implement in Module 05 -->
        <div class="p-4 text-white">
          <h2 class="font-bold text-lg">ZENTIC</h2>
        </div>
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
export class DashboardLayoutComponent {}
