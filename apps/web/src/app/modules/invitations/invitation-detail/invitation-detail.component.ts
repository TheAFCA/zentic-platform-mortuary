import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Invitation, InvitationStatus } from '@zentic/shared-types';
import { InvitationsApiService } from '../../../core/services/invitations-api.service';
import { StreamingApiService, StreamingEvent } from '../../../core/services/streaming-api.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { BadgeColor, BadgeComponent } from '../../../shared/atoms/badge/badge.component';
import { ConfirmDialogComponent } from '../../../shared/organisms/confirm-dialog/confirm-dialog.component';
import { ShareButtonsComponent } from '../../../shared/molecules/share-buttons/share-buttons.component';
import {
  InvitationFormComponent,
  InvitationFormSubmission,
  InvitationFormValue,
} from '../invitation-form/invitation-form.component';

@Component({
  selector: 'app-invitation-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    HasPermissionDirective,
    BadgeComponent,
    ConfirmDialogComponent,
    InvitationFormComponent,
    ShareButtonsComponent,
  ],
  templateUrl: './invitation-detail.component.html',
  styleUrl: './invitation-detail.component.scss',
})
export class InvitationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitationsApi = inject(InvitationsApiService);
  private readonly streamingApi = inject(StreamingApiService);

  readonly invitation = signal<Invitation | null>(null);
  readonly event = signal<StreamingEvent | null>(null);
  readonly eventOptions = signal<StreamingEvent[]>([]);
  readonly loading = signal(true);

  readonly editing = signal(false);
  readonly formError = signal('');

  readonly confirmPublish = signal(false);
  readonly actionError = signal('');
  readonly imageError = signal('');
  readonly generatingImage = signal(false);
  readonly copied = signal(false);

  get publicUrl(): string {
    const invitation = this.invitation();
    if (!invitation?.publicUrl) return '';
    return `${window.location.origin}/i/${invitation.publicUrl}`;
  }

  get shareMessage(): string {
    const invitation = this.invitation();
    const event = this.event();
    if (!invitation || !event) return '';

    const deceasedName = `${event.deceased.firstName} ${event.deceased.lastName}`;
    const date = new Date(event.scheduledAt).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
    const time = new Date(event.scheduledAt).toLocaleTimeString('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const place = event.room
      ? `${event.room.venue.name} - ${event.room.name}`
      : 'Lugar por confirmar';

    return (
      `Te invitamos a acompañarnos en memoria de ${deceasedName}.\n` +
      `📅 ${date}, ${time}\n` +
      `📍 ${place}\n` +
      `🔗 ${this.publicUrl}`
    );
  }

  statusBadgeColor(status: InvitationStatus): BadgeColor {
    if (status === InvitationStatus.PUBLISHED) return 'green';
    if (status === InvitationStatus.ARCHIVED) return 'gray';
    return 'yellow';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.load(id);
    this.streamingApi.findAll().subscribe((events) => this.eventOptions.set(events));
  }

  load(id: string): void {
    this.loading.set(true);
    this.invitationsApi.get(id).subscribe({
      next: (invitation) => {
        this.invitation.set(invitation);
        this.loading.set(false);
        this.streamingApi.findOne(invitation.eventId).subscribe((event) => this.event.set(event));
      },
      error: () => this.loading.set(false),
    });
  }

  editingFormValue(): InvitationFormValue | null {
    const invitation = this.invitation();
    if (!invitation) return null;
    return {
      eventId: invitation.eventId,
      template: invitation.template,
      message: invitation.message ?? '',
      accessCodeDisplay: invitation.accessCodeDisplay ?? '',
    };
  }

  openEdit(): void {
    this.formError.set('');
    this.editing.set(true);
  }

  closeEdit(): void {
    this.editing.set(false);
  }

  onSave(submission: InvitationFormSubmission): void {
    const invitation = this.invitation();
    if (!invitation) return;

    this.formError.set('');
    const { value } = submission;

    this.invitationsApi
      .update(invitation.id, {
        template: value.template,
        message: value.message || undefined,
        accessCodeDisplay: value.accessCodeDisplay || undefined,
      })
      .subscribe({
        next: () => {
          this.editing.set(false);
          this.load(invitation.id);
        },
        error: (error: HttpErrorResponse) => {
          this.formError.set(this.extractErrorMessage(error, 'No se pudo guardar la invitación'));
        },
      });
  }

  requestPublish(): void {
    this.confirmPublish.set(true);
  }

  cancelPublish(): void {
    this.confirmPublish.set(false);
  }

  confirmPublishAction(): void {
    const invitation = this.invitation();
    this.confirmPublish.set(false);
    if (!invitation) return;

    this.actionError.set('');
    this.invitationsApi.publish(invitation.id).subscribe({
      next: (updated) => this.invitation.set(updated),
      error: (error: HttpErrorResponse) => {
        this.actionError.set(this.extractErrorMessage(error, 'No se pudo publicar la invitación'));
      },
    });
  }

  downloadImage(): void {
    const invitation = this.invitation();
    const event = this.event();
    if (!invitation) return;

    this.imageError.set('');
    this.generatingImage.set(true);
    this.invitationsApi.generateImage(invitation.id).subscribe({
      next: (blob) => {
        this.generatingImage.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const year = event ? new Date(event.scheduledAt).getFullYear() : new Date().getFullYear();
        const nameSlug = event
          ? `${event.deceased.firstName}-${event.deceased.lastName}`
              .toLowerCase()
              .replace(/\s+/g, '-')
          : invitation.id;
        link.href = url;
        link.download = `invitacion-${nameSlug}-${year}.png`;
        link.click();
        URL.revokeObjectURL(url);
        // Refresca la invitación para reflejar el imageUrl (og:image) recién generado.
        this.load(invitation.id);
      },
      error: (error: HttpErrorResponse) => {
        this.generatingImage.set(false);
        this.imageError.set(
          this.extractErrorMessage(
            error,
            'No se pudo generar la imagen. El enlace público sigue disponible — intenta nuevamente.',
          ),
        );
      },
    });
  }

  copyPublicUrl(): void {
    void navigator.clipboard.writeText(this.publicUrl);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  goBack(): void {
    void this.router.navigate(['/admin/invitations']);
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? fallback;
  }
}
