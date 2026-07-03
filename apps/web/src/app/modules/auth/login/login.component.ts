import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../shared/atoms/input/input.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, InputComponent],
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
          <a routerLink="/auth/forgot-password" class="text-sm text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

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
  private router = inject(Router);

  loading = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    // TODO: Call AuthService.login() — implement in Module 02
  }
}
