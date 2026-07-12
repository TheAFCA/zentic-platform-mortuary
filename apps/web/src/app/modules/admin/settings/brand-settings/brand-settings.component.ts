import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TenantBrandConfig } from '@zentic/shared-types';
import { AdminSettingsApiService } from '../../../../core/services/admin-settings-api.service';
import { FileDropzoneComponent } from '../../../../shared/molecules/file-dropzone/file-dropzone.component';
import { ColorPickerComponent } from '../../../../shared/atoms/color-picker/color-picker.component';

@Component({
  selector: 'app-brand-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileDropzoneComponent, ColorPickerComponent],
  templateUrl: './brand-settings.component.html',
  styleUrl: './brand-settings.component.scss',
})
export class BrandSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsApi = inject(AdminSettingsApiService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
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
    this.settingsApi.getBrand().subscribe({
      next: (brand) => {
        this.applyBrand(brand);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
    this.settingsApi.uploadLogo(file).subscribe({
      next: (brand) => {
        this.applyBrand(brand);
        this.success.set('Logo actualizado');
      },
      error: (error: HttpErrorResponse) =>
        this.error.set(this.extractErrorMessage(error, 'No se pudo subir el logo')),
    });
  }

  onFaviconSelected(file: File): void {
    this.settingsApi.uploadFavicon(file).subscribe({
      next: (brand) => {
        this.applyBrand(brand);
        this.success.set('Favicon actualizado');
      },
      error: (error: HttpErrorResponse) =>
        this.error.set(this.extractErrorMessage(error, 'No se pudo subir el favicon')),
    });
  }

  onSubmit(): void {
    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.settingsApi.updateBrand(this.form.getRawValue()).subscribe({
      next: (brand) => {
        this.applyBrand(brand);
        this.saving.set(false);
        this.success.set('Colores guardados');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(this.extractErrorMessage(error, 'No se pudo guardar la marca'));
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

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? fallback;
  }
}
