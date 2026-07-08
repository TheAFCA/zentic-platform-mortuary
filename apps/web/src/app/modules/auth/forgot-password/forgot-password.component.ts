import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../shared/atoms/input/input.component';
import { AuthApiService } from '../../../core/services/auth-api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, InputComponent],
  template: `
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
        <p class="mt-2 text-sm text-gray-500">Ingresa tu email y te enviaremos las instrucciones</p>
      </div>

      <p *ngIf="sent" class="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        Si el email existe, recibirás las instrucciones de recuperación.
      </p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-input formControlName="email" type="email" placeholder="tu@funeraria.com" />
        <app-button type="submit" variant="primary" size="lg" [loading]="loading" class="w-full">
          Enviar instrucciones
        </app-button>
        <a
          routerLink="/auth/login"
          class="block text-center text-sm text-gray-500 hover:text-primary"
        >
          Volver al login
        </a>
      </form>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);

  loading = false;
  sent = false;
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      await this.authApi.forgotPassword(this.form.controls.email.value);
      this.sent = true;
    } finally {
      this.loading = false;
    }
  }
}
