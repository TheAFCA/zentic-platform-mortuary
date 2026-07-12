import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface VenueFormValue {
  name: string;
  address: string;
}

@Component({
  selector: 'app-venue-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './venue-form.component.html',
  styleUrl: './venue-form.component.scss',
})
export class VenueFormComponent implements OnChanges {
  @Input() initialValue: VenueFormValue | null = null;
  @Input() errorMessage = '';
  @Output() save = new EventEmitter<VenueFormValue>();
  @Output() cancel = new EventEmitter<void>();

  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    address: new FormControl('', { nonNullable: true }),
  });

  get isEditing(): boolean {
    return this.initialValue !== null;
  }

  ngOnChanges(): void {
    if (this.initialValue) {
      this.form.patchValue(this.initialValue);
    } else {
      this.form.reset({ name: '', address: '' });
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
