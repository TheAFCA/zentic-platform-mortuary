import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AdminSettingsApiService } from '../../../../core/services/admin-settings-api.service';
import { FeedbackBannerComponent } from '../../../../shared/molecules/feedback-banner/feedback-banner.component';
import { getErrorMessage } from '../../../../core/utils/error-message';

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
  imports: [CommonModule, ReactiveFormsModule, FeedbackBannerComponent],
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
  readonly loadError = signal('');
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
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.settingsApi.getSettings().subscribe({
      next: (settings) => {
        this.form.patchValue(settings);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(error, 'No se pudo cargar la configuración'));
      },
    });
  }

  onSubmit(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.settingsApi.updateSettings(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set('Configuración guardada');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(error, 'No se pudo guardar la configuración'));
      },
    });
  }
}
