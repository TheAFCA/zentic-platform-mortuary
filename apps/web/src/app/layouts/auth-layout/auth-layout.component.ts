import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--surface, #f7f8fa);
    }

    .auth-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .auth-wrap__inner {
      width: 100%;
      max-width: 28rem;
    }
  `],
  template: `
    <div class="auth-wrap">
      <div class="auth-wrap__inner">
        <router-outlet />
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {}
