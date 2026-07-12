import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TenantPlan } from '@zentic/shared-types';

export interface TenantFormValue {
  name: string;
  slug: string;
  country: string;
  adminEmail: string;
  plan: TenantPlan;
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;

@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './tenant-form.component.html',
  styleUrl: './tenant-form.component.scss',
})
export class TenantFormComponent implements OnChanges {
  @Input() initialValue: TenantFormValue | null = null;
  @Input() errorMessage = '';
  @Output() save = new EventEmitter<TenantFormValue>();
  @Output() cancel = new EventEmitter<void>();

  readonly plans = Object.values(TenantPlan);

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
    } else {
      this.form.reset({ name: '', slug: '', country: '', adminEmail: '', plan: TenantPlan.BASIC });
      this.form.controls.slug.enable();
      this.form.controls.adminEmail.enable();
    }
  }

  onSlugInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    this.form.controls.slug.setValue(sanitized, { emitEvent: false });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.getRawValue());
  }
}
