import { Component, inject, signal } from '@angular/core';
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
  styleUrl: './forgot-password.component.scss',
  template: `
    <section class="recovery-shell">
      <div class="recovery-shell__hero">
        <p class="recovery-shell__eyebrow">Recuperación segura</p>
        <h1>Recupera tu acceso sin fricción.</h1>
        <p>
          Te enviaremos un enlace de un solo uso para restablecer tu contraseña. Si no existe la
          cuenta, no lo revelaremos.
        </p>
      </div>

      <div class="recovery-card">
        <div class="recovery-card__header">
          <span class="recovery-card__icon material-icons">lock_reset</span>
          <div>
            <h2>Solicitar recuperación</h2>
            <p>Introduce el email asociado a tu cuenta.</p>
          </div>
        </div>

        <p *ngIf="sent()" class="recovery-success" role="status">
          Si el email existe, recibirás las instrucciones de recuperación.
        </p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="recovery-form" novalidate>
          <app-input formControlName="email" type="email" placeholder="tu@funeraria.com" />

          <p class="recovery-form__hint">
            Revisa tu bandeja de entrada y la carpeta de spam. El enlace vence en 1 hora.
          </p>

          <app-button
            type="submit"
            variant="primary"
            size="lg"
            [loading]="loading()"
            class="w-full"
          >
            Enviar enlace
          </app-button>

          <a routerLink="/auth/login" class="recovery-card__back">Volver al login</a>
        </form>
      </div>
    </section>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);

  loading = signal(false);
  sent = signal(false);
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    try {
      await this.authApi.forgotPassword(this.form.controls.email.value);
      this.sent.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
