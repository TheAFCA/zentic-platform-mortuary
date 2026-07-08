import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../shared/atoms/input/input.component';
import { AuthSessionService } from '../../../core/services/auth-session.service';

@Component({
  selector: 'app-super-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, InputComponent],
  template: `
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Super Admin</p>
        <h1 class="text-2xl font-bold text-gray-900 mt-2">Acceso a la plataforma</h1>
        <p class="mt-2 text-sm text-gray-500">Ingreso administrativo para el equipo interno</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <app-input formControlName="email" type="email" placeholder="superadmin@zentic.pro" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <app-input formControlName="password" type="password" placeholder="••••••••" />
        </div>

        @if (error) {
          <p class="text-sm text-red-600">{{ error }}</p>
        }

        <app-button
          type="submit"
          variant="primary"
          size="lg"
          [loading]="loading"
          [disabled]="form.invalid"
          class="w-full"
        >
          Entrar al panel
        </app-button>

        <a
          routerLink="/auth/login"
          class="block text-center text-sm text-gray-500 hover:text-primary"
        >
          Volver al login de funeraria
        </a>
      </form>
    </div>
  `,
})
export class SuperAdminLoginComponent {
  private fb = inject(FormBuilder);
  private session = inject(AuthSessionService);

  loading = false;
  error = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    try {
      await this.session.login(this.form.controls.email.value, this.form.controls.password.value);
    } catch {
      this.error = 'Email o contraseña incorrectos';
      this.loading = false;
    }
  }
}
