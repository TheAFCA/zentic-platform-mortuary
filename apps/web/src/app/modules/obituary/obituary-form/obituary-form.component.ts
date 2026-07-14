import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { QuillEditorComponent } from 'ngx-quill';
import { FileDropzoneComponent } from '../../../shared/molecules/file-dropzone/file-dropzone.component';
import { InitialsAvatarComponent } from '../../../shared/atoms/initials-avatar/initials-avatar.component';
import { ObituaryEventOption } from '../../../core/services/obituaries-api.service';

export interface ObituaryFormValue {
  firstName: string;
  lastName: string;
  birthDate: string;
  deathDate: string;
  birthCity: string;
  deathCity: string;
  epitaph: string;
  biography: string;
  eventId: string;
  isPublic: boolean;
  accessCode: string;
}

export interface ObituaryFormSubmission {
  value: ObituaryFormValue;
  photoFile: File | null;
}

const EMPTY_VALUE: ObituaryFormValue = {
  firstName: '',
  lastName: '',
  birthDate: '',
  deathDate: '',
  birthCity: '',
  deathCity: '',
  epitaph: '',
  biography: '',
  eventId: '',
  isPublic: true,
  accessCode: '',
};

@Component({
  selector: 'app-obituary-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    QuillEditorComponent,
    FileDropzoneComponent,
    InitialsAvatarComponent,
  ],
  templateUrl: './obituary-form.component.html',
  styleUrl: './obituary-form.component.scss',
})
export class ObituaryFormComponent implements OnChanges {
  @Input() initialValue: ObituaryFormValue | null = null;
  @Input() initialPhotoUrl: string | null = null;
  @Input() eventOptions: ObituaryEventOption[] = [];
  @Input() errorMessage = '';
  @Output() save = new EventEmitter<ObituaryFormSubmission>();
  @Output() cancel = new EventEmitter<void>();

  // RF-OBT-003: solo negrita/cursiva/párrafos — nada de encabezados, listas ni imágenes.
  readonly quillModules = { toolbar: [['bold', 'italic']] };
  readonly dateError = signal('');
  readonly photoPreviewUrl = signal<string | null>(null);
  private photoFile: File | null = null;

  form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    birthDate: new FormControl('', { nonNullable: true }),
    deathDate: new FormControl('', { nonNullable: true }),
    birthCity: new FormControl('', { nonNullable: true }),
    deathCity: new FormControl('', { nonNullable: true }),
    epitaph: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(150)] }),
    biography: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
    eventId: new FormControl('', { nonNullable: true }),
    isPublic: new FormControl(true, { nonNullable: true }),
    accessCode: new FormControl('', { nonNullable: true }),
  });

  get isEditing(): boolean {
    return this.initialValue !== null;
  }

  ngOnChanges(): void {
    this.photoFile = null;
    this.photoPreviewUrl.set(this.initialPhotoUrl);
    this.dateError.set('');

    if (this.initialValue) {
      this.form.patchValue(this.initialValue);
    } else {
      this.form.reset(EMPTY_VALUE);
    }
  }

  onPhotoSelected(file: File): void {
    this.photoFile = file;
    this.photoPreviewUrl.set(URL.createObjectURL(file));
  }

  submit(): void {
    this.dateError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (!this.datesAreValid(value.birthDate, value.deathDate)) {
      return;
    }

    this.save.emit({ value, photoFile: this.photoFile });
  }

  private datesAreValid(birthDate: string, deathDate: string): boolean {
    if (!deathDate) return true;

    const death = new Date(deathDate);
    if (death.getTime() > Date.now()) {
      this.dateError.set('La fecha de fallecimiento no puede ser posterior a la fecha actual');
      return false;
    }
    if (birthDate && new Date(birthDate).getTime() > death.getTime()) {
      this.dateError.set('La fecha de nacimiento no puede ser posterior a la de fallecimiento');
      return false;
    }
    return true;
  }
}
