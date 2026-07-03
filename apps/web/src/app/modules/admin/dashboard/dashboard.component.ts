import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from '../../../shared/molecules/stat-card/stat-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  template: `
    <div>
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-stat-card label="Eventos activos" value="—" icon="live_tv" />
        <app-stat-card label="Obituarios publicados" value="—" icon="article" />
        <app-stat-card label="Leads nuevos" value="—" icon="person_add" />
        <app-stat-card label="Clientes totales" value="—" icon="people" />
      </div>
      <!-- TODO: Implement dashboard widgets in Module 05 -->
    </div>
  `,
})
export class DashboardComponent {}
