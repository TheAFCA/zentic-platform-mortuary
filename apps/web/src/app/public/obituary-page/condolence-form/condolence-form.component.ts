import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ObituariesApiService } from '../../../core/services/obituaries-api.service';
import { getErrorMessage } from '../../../core/utils/error-message';

@Component({
  selector: 'app-condolence-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './condolence-form.component.html',
  styleUrl: './condolence-form.component.scss',
})
export class CondolenceFormComponent {
  @Input({ required: true }) slug!: string;
  @Input() requiresAccessCode = false;
  /** Código ya validado al desbloquear la página — evita pedirlo dos veces. */
  @Input() prefilledAccessCode: string | null = null;
  @Output() sent = new EventEmitter<void>();

  private readonly obituariesApi = inject(ObituariesApiService);

  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly errorMessage = signal('');

  form = new FormGroup({
    authorName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    content: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    }),
    accessCode: new FormControl('', { nonNullable: true }),
  });

  submit(): void {
    if (this.submitting()) return;
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitting.set(true);

    this.obituariesApi
      .submitMessage(this.slug, {
        authorName: value.authorName,
        content: value.content,
        accessCode: this.requiresAccessCode
          ? (this.prefilledAccessCode ?? value.accessCode)
          : undefined,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set(true);
          this.form.reset({ authorName: '', content: '', accessCode: '' });
          this.sent.emit();
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(getErrorMessage(error, 'No se pudo enviar tu mensaje'));
        },
      });
  }
}
