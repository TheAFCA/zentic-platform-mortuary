import { Component } from '@angular/core';

@Component({
  selector: 'app-event-page',
  standalone: true,
  imports: [],
  template: `
    <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-3xl font-bold">Evento en vivo</h1>
        <!-- TODO: Implement public streaming page in Module 06 -->
      </div>
    </div>
  `,
})
export class EventPageComponent {}
