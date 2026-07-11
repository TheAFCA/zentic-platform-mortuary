import { Component } from '@angular/core';

@Component({
  selector: 'app-impersonate-ended',
  standalone: true,
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Sesión de soporte finalizada</h1>
      <p class="text-gray-600">Puedes cerrar esta pestaña.</p>
    </div>
  `,
})
export class ImpersonateEndedComponent {}
