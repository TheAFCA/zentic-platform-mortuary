import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../shared/atoms/button/button.component';

@Component({
  selector: 'app-no-autorizado',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Acceso no autorizado</h1>
      <p class="text-gray-600 mb-6">No tienes permisos para acceder a esta sección</p>
      <app-button (onClick)="goBack()">Volver</app-button>
    </div>
  `,
})
export class NoAutorizadoComponent {
  constructor(private readonly router: Router) {}

  goBack() {
    void this.router.navigate(['/admin/dashboard']);
  }
}
