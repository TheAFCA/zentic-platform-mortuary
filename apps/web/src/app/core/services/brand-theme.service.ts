import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { TenantBrandConfig } from '@zentic/shared-types';

export type BrandThemeColors = Pick<TenantBrandConfig, 'primaryColor' | 'secondaryColor'>;
export type BrandPreviewColors = Pick<
  TenantBrandConfig,
  'primaryColor' | 'secondaryColor' | 'textColor' | 'backgroundColor'
>;

/**
 * Single place that turns a tenant's saved brand colors into CSS custom
 * properties. `apply()` pushes them onto :root so every --brand-primary/
 * --brand-secondary consumer (Tailwind utilities, _panel.scss mixins, the
 * Material system tokens in styles/_material-theme.scss) picks them up at
 * runtime. `previewVariables()` reuses the same derivation but scoped to
 * --preview-* for BrandSettingsComponent's unsaved-draft preview card, so
 * saving and previewing share one code path instead of two hand-rolled ones.
 */
@Injectable({ providedIn: 'root' })
export class BrandThemeService {
  private readonly document = inject(DOCUMENT);

  apply(brand: BrandThemeColors): void {
    const root = this.document.documentElement;
    for (const [name, value] of Object.entries(this.deriveBrandVariables(brand))) {
      root.style.setProperty(name, value);
    }
  }

  previewVariables(brand: BrandPreviewColors): Record<string, string> {
    return {
      '--preview-primary': brand.primaryColor,
      '--preview-secondary': brand.secondaryColor,
      '--preview-text': brand.textColor,
      '--preview-background': brand.backgroundColor,
    };
  }

  private deriveBrandVariables(brand: BrandThemeColors): Record<string, string> {
    const { primaryColor, secondaryColor } = brand;
    return {
      '--brand-primary': primaryColor,
      '--brand-primary-hover': `color-mix(in srgb, ${primaryColor} 85%, black)`,
      '--brand-primary-light': `color-mix(in srgb, ${primaryColor} 8%, white)`,
      '--brand-primary-subtle': `color-mix(in srgb, ${primaryColor} 4%, white)`,
      '--brand-secondary': secondaryColor,
      '--brand-secondary-light': `color-mix(in srgb, ${secondaryColor} 6%, white)`,
    };
  }
}
