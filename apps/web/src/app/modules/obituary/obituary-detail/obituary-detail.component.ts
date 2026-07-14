import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Obituary, ObituaryMessage, ObituaryStatus } from '@zentic/shared-types';
import {
  ObituariesApiService,
  ObituaryEventOption,
} from '../../../core/services/obituaries-api.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { InitialsAvatarComponent } from '../../../shared/atoms/initials-avatar/initials-avatar.component';
import { BadgeColor, BadgeComponent } from '../../../shared/atoms/badge/badge.component';
import { ConfirmDialogComponent } from '../../../shared/organisms/confirm-dialog/confirm-dialog.component';
import {
  ObituaryFormComponent,
  ObituaryFormSubmission,
  ObituaryFormValue,
} from '../obituary-form/obituary-form.component';
import { MessagesModerationComponent } from '../messages-moderation/messages-moderation.component';

@Component({
  selector: 'app-obituary-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    HasPermissionDirective,
    InitialsAvatarComponent,
    BadgeComponent,
    ConfirmDialogComponent,
    ObituaryFormComponent,
    MessagesModerationComponent,
  ],
  templateUrl: './obituary-detail.component.html',
  styleUrl: './obituary-detail.component.scss',
})
export class ObituaryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly obituariesApi = inject(ObituariesApiService);

  readonly obituary = signal<Obituary | null>(null);
  readonly messages = signal<ObituaryMessage[]>([]);
  readonly eventOptions = signal<ObituaryEventOption[]>([]);
  readonly loading = signal(true);

  readonly editing = signal(false);
  readonly formError = signal('');

  readonly confirmUnpublish = signal(false);
  readonly actionError = signal('');
  readonly bookError = signal('');

  get publicUrl(): string {
    const obituary = this.obituary();
    if (!obituary) return '';
    return `${window.location.origin}/o/${obituary.slug}`;
  }

  statusBadgeColor(status: ObituaryStatus): BadgeColor {
    if (status === ObituaryStatus.PUBLISHED) return 'green';
    if (status === ObituaryStatus.ARCHIVED) return 'gray';
    return 'yellow';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.load(id);
    this.obituariesApi.listEvents().subscribe((events) => this.eventOptions.set(events));
  }

  load(id: string): void {
    this.loading.set(true);
    this.obituariesApi.get(id).subscribe({
      next: (obituary) => {
        this.obituary.set(obituary);
        this.loading.set(false);
        this.loadMessages(obituary.id);
      },
      error: () => this.loading.set(false),
    });
  }

  loadMessages(id: string): void {
    this.obituariesApi.listMessages(id).subscribe((messages) => this.messages.set(messages));
  }

  editingFormValue(): ObituaryFormValue | null {
    const obituary = this.obituary();
    if (!obituary) return null;
    return {
      firstName: obituary.deceased.firstName,
      lastName: obituary.deceased.lastName,
      birthDate: obituary.deceased.birthDate?.slice(0, 10) ?? '',
      deathDate: obituary.deceased.deathDate?.slice(0, 10) ?? '',
      birthCity: obituary.deceased.birthCity ?? '',
      deathCity: obituary.deceased.deathCity ?? '',
      epitaph: obituary.deceased.epitaph ?? '',
      biography: obituary.deceased.biography ?? '',
      eventId: obituary.eventId ?? '',
      isPublic: obituary.isPublic,
      accessCode: obituary.accessCode ?? '',
    };
  }

  openEdit(): void {
    this.formError.set('');
    this.editing.set(true);
  }

  closeEdit(): void {
    this.editing.set(false);
  }

  onSave(submission: ObituaryFormSubmission): void {
    const obituary = this.obituary();
    if (!obituary) return;

    this.formError.set('');
    const { value, photoFile } = submission;

    const payload = {
      firstName: value.firstName,
      lastName: value.lastName,
      birthDate: value.birthDate || undefined,
      deathDate: value.deathDate || undefined,
      birthCity: value.birthCity || undefined,
      deathCity: value.deathCity || undefined,
      biography: value.biography || undefined,
      epitaph: value.epitaph || undefined,
      eventId: value.eventId || undefined,
      isPublic: value.isPublic,
      accessCode: value.isPublic ? undefined : value.accessCode || undefined,
    };

    this.obituariesApi.update(obituary.id, payload).subscribe({
      next: () => {
        if (photoFile) {
          this.obituariesApi.uploadPhoto(obituary.id, photoFile).subscribe({
            next: () => this.finishEdit(obituary.id),
            error: () => this.finishEdit(obituary.id),
          });
        } else {
          this.finishEdit(obituary.id);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(this.extractErrorMessage(error, 'No se pudo guardar el obituario'));
      },
    });
  }

  private finishEdit(id: string): void {
    this.editing.set(false);
    this.load(id);
  }

  publish(): void {
    const obituary = this.obituary();
    if (!obituary) return;

    this.actionError.set('');
    this.obituariesApi.publish(obituary.id).subscribe({
      next: (updated) => this.obituary.set(updated),
      error: (error: HttpErrorResponse) => {
        this.actionError.set(this.extractErrorMessage(error, 'No se pudo publicar el obituario'));
      },
    });
  }

  requestUnpublish(): void {
    this.confirmUnpublish.set(true);
  }

  cancelUnpublish(): void {
    this.confirmUnpublish.set(false);
  }

  confirmUnpublishAction(): void {
    const obituary = this.obituary();
    this.confirmUnpublish.set(false);
    if (!obituary) return;

    this.actionError.set('');
    this.obituariesApi.unpublish(obituary.id).subscribe({
      next: (updated) => this.obituary.set(updated),
      error: (error: HttpErrorResponse) => {
        this.actionError.set(
          this.extractErrorMessage(error, 'No se pudo despublicar el obituario'),
        );
      },
    });
  }

  approveMessage(messageId: string): void {
    const obituary = this.obituary();
    if (!obituary) return;
    this.obituariesApi
      .approveMessage(obituary.id, messageId)
      .subscribe(() => this.loadMessages(obituary.id));
  }

  rejectMessage(messageId: string): void {
    const obituary = this.obituary();
    if (!obituary) return;
    this.obituariesApi
      .rejectMessage(obituary.id, messageId)
      .subscribe(() => this.loadMessages(obituary.id));
  }

  downloadBookOfTributes(): void {
    const obituary = this.obituary();
    if (!obituary) return;

    this.bookError.set('');
    this.obituariesApi.downloadBookOfTributes(obituary.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const deathYear = obituary.deceased.deathDate
          ? new Date(obituary.deceased.deathDate).getFullYear()
          : new Date().getFullYear();
        link.href = url;
        link.download = `libro-homenajes-${obituary.slug}-${deathYear}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error: HttpErrorResponse) => {
        this.bookError.set(
          this.extractErrorMessage(error, 'No se pudo generar el libro de homenajes'),
        );
      },
    });
  }

  copyPublicUrl(): void {
    void navigator.clipboard.writeText(this.publicUrl);
  }

  goBack(): void {
    void this.router.navigate(['/admin/obituaries']);
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? fallback;
  }
}
