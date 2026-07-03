import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../shared/atoms/input/input.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, InputComponent],
  template: `
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
        <p class="mt-2 text-sm text-gray-500">
          Ingresa tu email y te enviaremos las instrucciones
        </p>
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-input formControlName="email" type="email" placeholder="tu@funeraria.com" />
        <app-button type="submit" variant="primary" size="lg" [loading]="loading" class="w-full">
          Enviar instrucciones
        </app-button>
        <a routerLink="/auth/login" class="block text-center text-sm text-gray-500 hover:text-primary">
          Volver al login
        </a>
      </form>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);

  loading = false;
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    // TODO: Implement in Module 02
  }
}
