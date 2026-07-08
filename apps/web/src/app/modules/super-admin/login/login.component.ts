import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthSessionService } from '../../../core/services/auth-session.service';

type LoginBenefit = {
  icon: string;
  title: string;
  description: string;
};

type Brand = {
  name: string;
  logo: string;
  subtitle: string;
  primary: string;
  primaryHover: string;
  secondary: string;
};

@Component({
  selector: 'app-super-admin-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal('');
  readonly submitLabel = computed(() => (this.loading() ? 'Ingresando...' : 'Entrar al panel'));

  readonly brand = signal<Brand>({
    name: 'Homena Control',
    logo: 'HC',
    subtitle: 'Acceso administrativo',
    primary: '#1f2937',
    primaryHover: '#0f172a',
    secondary: '#6b7280',
  });

  readonly benefits: LoginBenefit[] = [
    {
      icon: 'admin_panel_settings',
      title: 'Gobierno global',
      description: 'Supervisión de tenants, permisos y configuración desde una única consola.',
    },
    {
      icon: 'shield',
      title: 'Seguridad reforzada',
      description: 'Acceso interno con una experiencia limpia, privada y de alto contraste.',
    },
    {
      icon: 'query_stats',
      title: 'Auditoría unificada',
      description: 'Monitorea actividad, sesiones y cambios con precisión operativa.',
    },
  ];

  readonly productMeta = {
    version: 'v1.0.0',
    status: 'Todos los servicios operativos',
  };

  readonly supportHref = 'mailto:soporte@homena.pro';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [true],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      await this.session.login(this.form.controls.email.value, this.form.controls.password.value);
    } catch {
      this.error.set('Email o contraseña incorrectos');
    } finally {
      this.loading.set(false);
    }
  }
}
