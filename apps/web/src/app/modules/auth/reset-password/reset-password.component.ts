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
  template: `
    <div class="w-full max-w-sm">
      <h1 class="text-2xl font-bold text-gray-900 mb-8 text-center">Nueva contraseña</h1>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-input formControlName="password" type="password" placeholder="Nueva contraseña" />
        <app-input formControlName="confirm" type="password" placeholder="Confirmar contraseña" />
        <app-button type="submit" variant="primary" size="lg" [loading]="loading" class="w-full">
          Cambiar contraseña
        </app-button>
      </form>
    </div>
  `,
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);

  loading = false;
  success = false;
  token = this.route.snapshot.paramMap.get('token') ?? '';
  form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required],
  });

  async onSubmit() {
    if (!this.token) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.controls.password.value !== this.form.controls.confirm.value) {
      this.form.controls.confirm.setErrors({ mismatch: true });
      return;
    }

    this.loading = true;
    try {
      await this.authApi.resetPassword(this.token, this.form.controls.password.value);
      this.success = true;
      await this.router.navigate(['/auth/login']);
    } finally {
      this.loading = false;
    }
  }
}
