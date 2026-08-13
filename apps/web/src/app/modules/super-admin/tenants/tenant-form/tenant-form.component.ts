import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TENANT_MODULE_KEYS, TenantModuleKey, TenantPlan } from '@zentic/shared-types';
import { TenantModuleTogglesComponent } from '../tenant-module-toggles/tenant-module-toggles.component';

export interface TenantFormValue {
  name: string;
  slug: string;
  country: string;
  adminEmail: string;
  plan: TenantPlan;
  enabledModules: TenantModuleKey[];
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;

@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TenantModuleTogglesComponent,
  ],
  templateUrl: './tenant-form.component.html',
  styleUrl: './tenant-form.component.scss',
})
export class TenantFormComponent implements OnChanges {
  @Input() initialValue: TenantFormValue | null = null;
  @Input() errorMessage = '';
  @Input() saving = false;
  @Output() save = new EventEmitter<TenantFormValue>();
  @Output() cancel = new EventEmitter<void>();

  readonly plans = Object.values(TenantPlan);
  enabledModules: TenantModuleKey[] = [...TENANT_MODULE_KEYS];

  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SLUG_PATTERN)],
    }),
    country: new FormControl('', { nonNullable: true }),
    adminEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    plan: new FormControl<TenantPlan>(TenantPlan.BASIC, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  get isEditing(): boolean {
    return this.initialValue !== null;
  }

  ngOnChanges(): void {
    if (this.initialValue) {
      this.form.patchValue(this.initialValue);
      this.form.controls.slug.disable();
      this.form.controls.adminEmail.disable();
      this.enabledModules = this.initialValue.enabledModules;
    } else {
      this.form.reset({ name: '', slug: '', country: '', adminEmail: '', plan: TenantPlan.BASIC });
      this.form.controls.slug.enable();
      this.form.controls.adminEmail.enable();
      this.enabledModules = [...TENANT_MODULE_KEYS];
    }
  }

  onSlugInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    this.form.controls.slug.setValue(sanitized, { emitEvent: false });
  }

  onModulesChange(enabledModules: TenantModuleKey[]): void {
    this.enabledModules = enabledModules;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit({ ...this.form.getRawValue(), enabledModules: this.enabledModules });
  }
}
