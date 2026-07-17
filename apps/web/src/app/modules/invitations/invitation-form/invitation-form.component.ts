import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { InvitationTemplate } from '@zentic/shared-types';
import { StreamingEvent } from '../../../core/services/streaming-api.service';
import { InvitationPreviewComponent } from '../invitation-preview/invitation-preview.component';

export interface InvitationFormValue {
  eventId: string;
  template: InvitationTemplate;
  message: string;
  accessCodeDisplay: string;
}

export interface InvitationFormSubmission {
  value: InvitationFormValue;
}

const EMPTY_VALUE: InvitationFormValue = {
  eventId: '',
  template: InvitationTemplate.CLASSIC,
  message: '',
  accessCodeDisplay: '',
};

@Component({
  selector: 'app-invitation-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    InvitationPreviewComponent,
  ],
  templateUrl: './invitation-form.component.html',
  styleUrl: './invitation-form.component.scss',
})
export class InvitationFormComponent implements OnChanges {
  @Input() initialValue: InvitationFormValue | null = null;
  @Input() eventOptions: StreamingEvent[] = [];
  @Input() errorMessage = '';
  @Input() saving = false;
  @Output() save = new EventEmitter<InvitationFormSubmission>();
  @Output() cancel = new EventEmitter<void>();

  readonly templates = Object.values(InvitationTemplate);

  form = new FormGroup({
    eventId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    template: new FormControl<InvitationTemplate>(InvitationTemplate.CLASSIC, {
      nonNullable: true,
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
    accessCodeDisplay: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  get isEditing(): boolean {
    return this.initialValue !== null;
  }

  get messageLength(): number {
    return this.formValue().message?.length ?? 0;
  }

  get selectedEvent(): StreamingEvent | null {
    const eventId = this.formValue().eventId;
    return this.eventOptions.find((event) => event.id === eventId) ?? null;
  }

  get selectedEventHasAccessCode(): boolean {
    return this.selectedEvent?.hasAccessCode ?? false;
  }

  get previewTemplate(): InvitationTemplate {
    return this.formValue().template ?? InvitationTemplate.CLASSIC;
  }

  get previewMessage(): string {
    return this.formValue().message ?? '';
  }

  get previewAccessCodeDisplay(): string | null {
    return this.selectedEventHasAccessCode ? this.formValue().accessCodeDisplay || null : null;
  }

  ngOnChanges(): void {
    if (this.initialValue) {
      this.form.patchValue(this.initialValue);
      // El evento vinculado es inmutable tras crear la invitación.
      this.form.controls.eventId.disable();
    } else {
      this.form.reset(EMPTY_VALUE);
      this.form.controls.eventId.enable();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit({ value: this.form.getRawValue() });
  }
}
