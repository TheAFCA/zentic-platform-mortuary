import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../shared/atoms/input/input.component';

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

  loading = false;
  form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required],
  });

  onSubmit() {
    // TODO: Implement in Module 02
  }
}
