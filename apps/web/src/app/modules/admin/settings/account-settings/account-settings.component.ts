import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AdminSettingsApiService } from '../../../../core/services/admin-settings-api.service';

const TIMEZONE_OPTIONS = [
  'America/Bogota',
  'America/Mexico_City',
  'America/Lima',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/New_York',
];

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-settings.component.html',
  styleUrl: './account-settings.component.scss',
})
export class AccountSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsApi = inject(AdminSettingsApiService);

  readonly timezones = TIMEZONE_OPTIONS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  form = this.fb.nonNullable.group({
    timezone: ['America/Bogota'],
    locale: ['es'],
    notifyNewLead: [true],
    notifyPendingMessages: [true],
    notifyWeeklySummary: [false],
    requireAccessCodeDefault: [false],
  });

  ngOnInit(): void {
    this.settingsApi.getSettings().subscribe({
      next: (settings) => {
        this.form.patchValue(settings);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSubmit(): void {
    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.settingsApi.updateSettings(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set('Configuración guardada');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(this.extractErrorMessage(error, 'No se pudo guardar la configuración'));
      },
    });
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? fallback;
  }
}
