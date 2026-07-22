import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TenantBrandConfig } from '@zentic/shared-types';
import { AdminSettingsApiService } from '../../../../core/services/admin-settings-api.service';
import { FileDropzoneComponent } from '../../../../shared/molecules/file-dropzone/file-dropzone.component';
import { ColorPickerComponent } from '../../../../shared/atoms/color-picker/color-picker.component';
import { FeedbackBannerComponent } from '../../../../shared/molecules/feedback-banner/feedback-banner.component';
import { getErrorMessage } from '../../../../core/utils/error-message';

@Component({
  selector: 'app-brand-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FileDropzoneComponent,
    ColorPickerComponent,
    FeedbackBannerComponent,
  ],
  templateUrl: './brand-settings.component.html',
  styleUrl: './brand-settings.component.scss',
})
export class BrandSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsApi = inject(AdminSettingsApiService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly loadError = signal('');
  readonly uploading = signal(false);
  readonly success = signal('');
  readonly logoUrl = signal<string | null>(null);
  readonly faviconUrl = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    primaryColor: ['#1a1a2e'],
    secondaryColor: ['#16213e'],
    textColor: ['#333333'],
    backgroundColor: ['#f5f5f5'],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.settingsApi.getBrand().subscribe({
      next: (brand) => {
        this.applyBrand(brand);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(error, 'No se pudo cargar la configuración de marca'));
      },
    });
  }

  get previewStyle(): Record<string, string> {
    const value = this.form.getRawValue();
    return {
      '--preview-primary': value.primaryColor,
      '--preview-secondary': value.secondaryColor,
      '--preview-text': value.textColor,
      '--preview-background': value.backgroundColor,
    };
  }

  onLogoSelected(file: File): void {
    if (this.uploading()) return;
    this.uploading.set(true);
    this.error.set('');
    this.settingsApi.uploadLogo(file).subscribe({
      next: (brand) => {
        this.applyBrand(brand);
        this.uploading.set(false);
        this.success.set('Logo actualizado');
      },
      error: (error: unknown) => {
        this.uploading.set(false);
        this.error.set(getErrorMessage(error, 'No se pudo subir el logo'));
      },
    });
  }

  onFaviconSelected(file: File): void {
    if (this.uploading()) return;
    this.uploading.set(true);
    this.error.set('');
    this.settingsApi.uploadFavicon(file).subscribe({
      next: (brand) => {
        this.applyBrand(brand);
        this.uploading.set(false);
        this.success.set('Favicon actualizado');
      },
      error: (error: unknown) => {
        this.uploading.set(false);
        this.error.set(getErrorMessage(error, 'No se pudo subir el favicon'));
      },
    });
  }

  onSubmit(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.settingsApi.updateBrand(this.form.getRawValue()).subscribe({
      next: (brand) => {
        this.applyBrand(brand);
        this.saving.set(false);
        this.success.set('Colores guardados');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(error, 'No se pudo guardar la marca'));
      },
    });
  }

  private applyBrand(brand: TenantBrandConfig): void {
    this.form.patchValue({
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      textColor: brand.textColor,
      backgroundColor: brand.backgroundColor,
    });
    this.logoUrl.set(brand.logoUrl);
    this.faviconUrl.set(brand.faviconUrl);
  }
}
