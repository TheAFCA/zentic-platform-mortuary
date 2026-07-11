import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Permission } from '@zentic/shared-types';
import { PermissionEditorComponent } from '../permission-editor/permission-editor.component';

export interface UserFormValue {
  email: string;
  role: 'OPERATOR' | 'VIEWER';
  permissions: Permission[];
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    PermissionEditorComponent,
  ],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent implements OnChanges {
  @Input() initialValue: UserFormValue | null = null;
  @Output() save = new EventEmitter<UserFormValue>();
  @Output() cancel = new EventEmitter<void>();

  permissions: Permission[] = [];

  form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    role: new FormControl<'OPERATOR' | 'VIEWER'>('OPERATOR', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnChanges(): void {
    this.permissions = this.initialValue?.permissions ?? [];
    this.form.patchValue({
      email: this.initialValue?.email ?? '',
      role: this.initialValue?.role ?? 'OPERATOR',
    });
    if (this.initialValue) {
      this.form.controls.email.disable();
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const { email, role } = this.form.getRawValue();
    this.save.emit({ email, role, permissions: this.permissions });
  }
}
