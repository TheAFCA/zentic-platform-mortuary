import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  styleUrl: './security-settings.component.scss',
  template: `
    <section class="settings-shell">
      <div class="settings-shell__copy">
        <p class="settings-shell__eyebrow">Seguridad de cuenta</p>
        <h1>Cambia tu contraseña desde tu perfil.</h1>
        <p>
          Mantén tu cuenta protegida con una contraseña fuerte. Al actualizarla, se cerrarán las
          sesiones activas en otros dispositivos.
        </p>
      </div>

      <div class="settings-card">
        <div class="settings-card__header">
          <span class="settings-card__icon material-icons">manage_accounts</span>
          <div>
            <h2>Cambiar contraseña</h2>
            <p>Ingresa tu contraseña actual y define una nueva.</p>
          </div>
        </div>

        <p *ngIf="success()" class="settings-success" role="status">{{ success() }}</p>
        <p *ngIf="error()" class="settings-error" role="alert">{{ error() }}</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="settings-form" novalidate>
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

          <ul class="password-rules">
            <li>8 caracteres mínimo</li>
            <li>Una mayúscula</li>
            <li>Un número</li>
            <li>Un símbolo</li>
          </ul>

          <app-button
            type="submit"
            variant="primary"
            size="lg"
            [loading]="loading()"
            class="w-full"
          >
            Guardar y cerrar sesiones
          </app-button>
        </form>
      </div>
    </section>
  `,
})
export class SecuritySettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authSession = inject(AuthSessionService);

  loading = signal(false);
  error = signal('');
  success = signal('');

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
      this.error.set('Las contraseñas no coinciden');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    try {
      await this.authApi.changePassword(
        this.form.controls.currentPassword.value,
        this.form.controls.newPassword.value,
      );
      this.success.set('Contraseña actualizada. Debes iniciar sesión nuevamente.');
      await this.authSession.logout();
    } catch {
      this.error.set('No se pudo actualizar la contraseña');
    } finally {
      this.loading.set(false);
    }
  }
}
