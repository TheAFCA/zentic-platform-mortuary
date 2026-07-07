import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../shared/atoms/input/input.component';
import { AuthSessionService } from '../../../core/services/auth-session.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  template: `
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
        <p class="mt-2 text-sm text-gray-500">Accede a tu panel de gestión</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <app-input formControlName="email" type="email" placeholder="tu@funeraria.com" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <app-input formControlName="password" type="password" placeholder="••••••••" />
        </div>

        <div class="flex items-center justify-end">
          <span class="text-sm text-gray-400">Acceso interno protegido</span>
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
          Ingresar
        </app-button>
      </form>
    </div>
  `,
})
export class LoginComponent {
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
