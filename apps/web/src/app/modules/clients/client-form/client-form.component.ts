import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ClientStatus } from '@zentic/shared-types';

export interface ClientFormValue {
  name: string;
  email: string;
  phone: string;
  relationship: string;
  notes: string;
  status: ClientStatus;
  serviceDate: string;
}

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.scss',
})
export class ClientFormComponent implements OnChanges {
  @Input() initialValue: ClientFormValue | null = null;
  @Input() convertedFromLeadName: string | null = null;
  @Input() errorMessage = '';
  @Input() saving = false;
  @Output() save = new EventEmitter<ClientFormValue>();
  @Output() cancel = new EventEmitter<void>();

  readonly statuses = Object.values(ClientStatus);

  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email],
    }),
    phone: new FormControl('', { nonNullable: true }),
    relationship: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    status: new FormControl<ClientStatus>(ClientStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    serviceDate: new FormControl('', { nonNullable: true }),
  });

  get isEditing(): boolean {
    return this.initialValue !== null;
  }

  ngOnChanges(): void {
    if (this.initialValue) {
      this.form.patchValue(this.initialValue);
    } else {
      this.form.reset({
        name: '',
        email: '',
        phone: '',
        relationship: '',
        notes: '',
        status: ClientStatus.ACTIVE,
        serviceDate: '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.getRawValue());
  }
}
