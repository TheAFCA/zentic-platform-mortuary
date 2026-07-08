import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../shared/atoms/input/input.component';
import { AuthApiService } from '../../../core/services/auth-api.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  styleUrl: './reset-password.component.scss',
  template: `
    <section class="recovery-shell">
      <div class="recovery-shell__hero">
        <p class="recovery-shell__eyebrow">Nueva contraseña</p>
        <h1>Define una clave fuerte y segura.</h1>
        <p>Debe incluir mayúscula, minúscula, número y símbolo. El enlace es de un solo uso.</p>
      </div>

      <div class="recovery-card">
        <div class="recovery-card__header">
          <span class="recovery-card__icon material-icons">vpn_key</span>
          <div>
            <h2>Restablecer contraseña</h2>
            <p>Elige una nueva contraseña para tu cuenta.</p>
          </div>
        </div>

        <p *ngIf="success" class="recovery-success" role="status">
          Contraseña actualizada. Te redirigimos al login.
        </p>

        <p *ngIf="error" class="recovery-error" role="alert">{{ error }}</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="recovery-form" novalidate>
          <app-input formControlName="password" type="password" placeholder="Nueva contraseña" />
          <app-input formControlName="confirm" type="password" placeholder="Confirmar contraseña" />

          <ul class="password-rules">
            <li>8 caracteres mínimo</li>
            <li>Una mayúscula</li>
            <li>Un número</li>
            <li>Un símbolo</li>
          </ul>

          <app-button type="submit" variant="primary" size="lg" [loading]="loading" class="w-full">
            Cambiar contraseña
          </app-button>
        </form>
      </div>
    </section>
  `,
})
export class ResetPasswordComponent {
  private static readonly passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  private fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);

  loading = false;
  success = false;
  error = '';
  token = this.route.snapshot.paramMap.get('token') ?? '';
  form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required],
  });

  async onSubmit() {
    if (!this.token) {
      this.error = 'El enlace no es válido';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.controls.password.value !== this.form.controls.confirm.value) {
      this.error = 'Las contraseñas no coinciden';
      this.form.controls.confirm.setErrors({ mismatch: true });
      return;
    }

    if (!ResetPasswordComponent.passwordRules.test(this.form.controls.password.value)) {
      this.error = 'La contraseña no cumple los requisitos mínimos';
      return;
    }

    this.loading = true;
    this.error = '';
    try {
      await this.authApi.resetPassword(this.token, this.form.controls.password.value);
      this.success = true;
      await this.router.navigate(['/auth/login']);
    } catch {
      this.error = 'No pudimos actualizar la contraseña. Intenta con un nuevo enlace.';
    } finally {
      this.loading = false;
    }
  }
}
