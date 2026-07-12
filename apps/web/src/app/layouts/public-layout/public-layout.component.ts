import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet],
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f9fafb;
      }
    `,
  ],
  template: ` <router-outlet /> `,
})
export class PublicLayoutComponent {}
