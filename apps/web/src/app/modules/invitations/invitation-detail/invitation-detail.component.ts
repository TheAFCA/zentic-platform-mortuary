import { CommonModule } from '@angular/common';
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
import { FeedbackBannerComponent } from '../../../shared/molecules/feedback-banner/feedback-banner.component';
import { NotificationService } from '../../../core/services/notification.service';
import { getErrorMessage } from '../../../core/utils/error-message';

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
    FeedbackBannerComponent,
  ],
  templateUrl: './invitation-detail.component.html',
  styleUrl: './invitation-detail.component.scss',
})
export class InvitationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitationsApi = inject(InvitationsApiService);
  private readonly streamingApi = inject(StreamingApiService);
  private readonly notifications = inject(NotificationService);

  readonly invitation = signal<Invitation | null>(null);
  readonly event = signal<StreamingEvent | null>(null);
  readonly eventOptions = signal<StreamingEvent[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly actionLoading = signal(false);

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
    this.streamingApi.findAll().subscribe({
      next: (events) => this.eventOptions.set(events),
      error: (error: unknown) =>
        this.notifications.apiError(error, 'No se pudieron cargar los eventos disponibles'),
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.loadError.set('');
    this.invitationsApi.get(id).subscribe({
      next: (invitation) => {
        this.invitation.set(invitation);
        this.loading.set(false);
        this.streamingApi.findOne(invitation.eventId).subscribe({
          next: (event) => this.event.set(event),
          error: (error: unknown) =>
            this.notifications.apiError(error, 'No se pudo cargar el evento de la invitación'),
        });
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(error, 'No se pudo cargar la invitación'));
      },
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
    if (!invitation || this.saving()) return;

    this.formError.set('');
    this.saving.set(true);
    const { value } = submission;

    this.invitationsApi
      .update(invitation.id, {
        template: value.template,
        message: value.message || undefined,
        accessCodeDisplay: value.accessCodeDisplay || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing.set(false);
          this.notifications.success('Invitación actualizada');
          this.load(invitation.id);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(getErrorMessage(error, 'No se pudo guardar la invitación'));
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
    if (!invitation || this.actionLoading()) return;

    this.actionError.set('');
    this.actionLoading.set(true);
    this.invitationsApi.publish(invitation.id).subscribe({
      next: (updated) => {
        this.actionLoading.set(false);
        this.confirmPublish.set(false);
        this.invitation.set(updated);
        this.notifications.success('Invitación publicada');
      },
      error: (error: unknown) => {
        this.actionLoading.set(false);
        this.actionError.set(getErrorMessage(error, 'No se pudo publicar la invitación'));
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
        this.notifications.success('Imagen de invitación descargada');
        // Refresca la invitación para reflejar el imageUrl (og:image) recién generado.
        this.load(invitation.id);
      },
      error: (error: unknown) => {
        this.generatingImage.set(false);
        this.imageError.set(
          getErrorMessage(
            error,
            'No se pudo generar la imagen. El enlace público sigue disponible — intenta nuevamente.',
          ),
        );
      },
    });
  }

  copyPublicUrl(): void {
    void navigator.clipboard
      .writeText(this.publicUrl)
      .then(() => {
        this.copied.set(true);
        this.notifications.success('Enlace copiado');
        setTimeout(() => this.copied.set(false), 2000);
      })
      .catch(() => this.notifications.error('No se pudo copiar el enlace'));
  }

  goBack(): void {
    void this.router.navigate(['/admin/invitations']);
  }

  retryLoad(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }
}
