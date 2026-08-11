import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { QuillEditorComponent } from 'ngx-quill';
import { Venue } from '@zentic/shared-types';
import { FileDropzoneComponent } from '../../../shared/molecules/file-dropzone/file-dropzone.component';
import { InitialsAvatarComponent } from '../../../shared/atoms/initials-avatar/initials-avatar.component';

export interface ObituaryFormValue {
  firstName: string;
  lastName: string;
  birthDate: string;
  deathDate: string;
  birthCity: string;
  deathCity: string;
  epitaph: string;
  biography: string;
  serviceType: string;
  serviceAt: string;
  roomId: string;
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
  serviceType: 'VELATORIO',
  serviceAt: '',
  roomId: '',
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
  @Input() venues: Venue[] = [];
  @Input() errorMessage = '';
  @Input() saving = false;
  @Output() save = new EventEmitter<ObituaryFormSubmission>();
  @Output() cancel = new EventEmitter<void>();

  // RF-OBT-003: solo negrita/cursiva/párrafos — nada de encabezados, listas ni imágenes.
  readonly quillModules = { toolbar: [['bold', 'italic']] };
  readonly dateError = signal('');
  readonly photoPreviewUrl = signal<string | null>(null);
  readonly selectedVenue = signal<Venue | null>(null);
  readonly rooms = signal<Venue['rooms']>([]);
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
    serviceType: new FormControl('VELATORIO', { nonNullable: true }),
    serviceDate: new FormControl('', { nonNullable: true }),
    serviceTime: new FormControl('', { nonNullable: true }),
    venueId: new FormControl<string | null>(null),
    roomId: new FormControl<string | null>(null),
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
      const { serviceAt, roomId, ...rest } = this.initialValue;
      const serviceDate = serviceAt ? serviceAt.slice(0, 10) : '';
      const serviceTime = serviceAt ? new Date(serviceAt).toTimeString().slice(0, 5) : '';
      this.form.patchValue({ ...rest, roomId, serviceDate, serviceTime });

      const parentVenue = roomId
        ? this.venues.find((v) => v.rooms.some((r) => r.id === roomId))
        : null;
      if (parentVenue) {
        this.onVenueChange(parentVenue.id);
        this.form.patchValue({ venueId: parentVenue.id, roomId });
      } else {
        this.selectedVenue.set(null);
        this.rooms.set([]);
      }
    } else {
      this.form.reset(EMPTY_VALUE);
      this.selectedVenue.set(null);
      this.rooms.set([]);
    }
  }

  onVenueChange(venueId: string | null): void {
    const venue = this.venues.find((v) => v.id === venueId) ?? null;
    this.selectedVenue.set(venue);
    this.rooms.set(venue?.rooms ?? []);
    if (!venue) this.form.patchValue({ roomId: null });
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

    const raw = this.form.getRawValue();
    if (!this.datesAreValid(raw.birthDate, raw.deathDate)) {
      return;
    }

    const serviceAt =
      raw.serviceDate && raw.serviceTime
        ? new Date(`${raw.serviceDate}T${raw.serviceTime}:00`).toISOString()
        : '';

    const value: ObituaryFormValue = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      birthDate: raw.birthDate,
      deathDate: raw.deathDate,
      birthCity: raw.birthCity,
      deathCity: raw.deathCity,
      epitaph: raw.epitaph,
      biography: raw.biography,
      serviceType: raw.serviceType,
      serviceAt,
      roomId: raw.roomId ?? '',
      isPublic: raw.isPublic,
      accessCode: raw.accessCode,
    };

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
