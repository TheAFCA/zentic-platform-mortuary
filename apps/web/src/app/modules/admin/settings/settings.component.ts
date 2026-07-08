import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { ButtonComponent } from '../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../shared/atoms/input/input.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  template: `
    <div class="max-w-xl">
      <h1 class="text-2xl font-bold text-gray-900">Configuración</h1>
      <p class="mt-2 text-sm text-gray-500">Actualiza tu contraseña desde tu perfil.</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-6 space-y-4">
        <app-input
          formControlName="currentPassword"
          type="password"
          placeholder="Contraseña actual"
        />
        <app-input formControlName="newPassword" type="password" placeholder="Nueva contraseña" />
        <app-input
          formControlName="confirmPassword"
          type="password"
          placeholder="Confirmar contraseña"
        />

        <p *ngIf="error" class="text-sm text-red-600">{{ error }}</p>
        <app-button type="submit" variant="primary" size="lg" [loading]="loading" class="w-full">
          Cambiar contraseña
        </app-button>
      </form>
    </div>
  `,
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authSession = inject(AuthSessionService);

  loading = false;
  error = '';

  form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.controls.newPassword.value !== this.form.controls.confirmPassword.value) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      await this.authApi.changePassword(
        this.form.controls.currentPassword.value,
        this.form.controls.newPassword.value,
      );
      await this.authSession.logout();
    } catch {
      this.error = 'No se pudo actualizar la contraseña';
    } finally {
      this.loading = false;
    }
  }
}
