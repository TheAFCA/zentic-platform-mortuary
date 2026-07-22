import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface RoomFormValue {
  name: string;
  capacity: number | null;
}

@Component({
  selector: 'app-room-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './room-form.component.html',
  styleUrl: './room-form.component.scss',
})
export class RoomFormComponent implements OnChanges {
  @Input() initialValue: RoomFormValue | null = null;
  @Input() errorMessage = '';
  @Input() saving = false;
  @Output() save = new EventEmitter<RoomFormValue>();
  @Output() cancel = new EventEmitter<void>();

  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    capacity: new FormControl<number | null>(null, { validators: [Validators.min(1)] }),
  });

  get isEditing(): boolean {
    return this.initialValue !== null;
  }

  ngOnChanges(): void {
    if (this.initialValue) {
      this.form.patchValue(this.initialValue);
    } else {
      this.form.reset({ name: '', capacity: null });
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
