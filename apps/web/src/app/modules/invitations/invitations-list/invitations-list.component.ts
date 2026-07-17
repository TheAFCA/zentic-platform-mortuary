import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Invitation, InvitationStatus } from '@zentic/shared-types';
import { InvitationsApiService } from '../../../core/services/invitations-api.service';
import { StreamingApiService, StreamingEvent } from '../../../core/services/streaming-api.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/organisms/data-table/data-table.component';
import { BadgeColor, BadgeComponent } from '../../../shared/atoms/badge/badge.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import {
  InvitationFormComponent,
  InvitationFormSubmission,
} from '../invitation-form/invitation-form.component';
import { NotificationService } from '../../../core/services/notification.service';
import { getErrorMessage } from '../../../core/utils/error-message';

export interface InvitationRow extends Invitation {
  eventTitle: string;
}

function toRow(invitation: Invitation, eventOptions: StreamingEvent[]): InvitationRow {
  const event = eventOptions.find((e) => e.id === invitation.eventId);
  const eventTitle = event
    ? `${event.deceased.firstName} ${event.deceased.lastName}`
    : invitation.eventId;
  return { ...invitation, eventTitle };
}

@Component({
  selector: 'app-invitations-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    DataTableComponent,
    BadgeComponent,
    HasPermissionDirective,
    InvitationFormComponent,
  ],
  templateUrl: './invitations-list.component.html',
  styleUrl: './invitations-list.component.scss',
})
export class InvitationsListComponent implements OnInit {
  private readonly invitationsApi = inject(InvitationsApiService);
  private readonly streamingApi = inject(StreamingApiService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  private readonly rawInvitations = signal<Invitation[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly statusFilter = signal<InvitationStatus | ''>('');

  readonly showForm = signal(false);
  readonly formError = signal('');
  readonly eventOptions = signal<StreamingEvent[]>([]);

  // computed en vez de recalcular una sola vez en load(): evita depender del orden de llegada
  // de las respuestas de /invitations y /events (ambas se disparan en paralelo en ngOnInit).
  readonly invitations = computed(() =>
    this.rawInvitations().map((invitation) => toRow(invitation, this.eventOptions())),
  );

  readonly statuses = Object.values(InvitationStatus);

  readonly columns: DataTableColumn<InvitationRow>[] = [
    { key: 'eventTitle', label: 'Evento' },
    { key: 'template', label: 'Plantilla' },
    { key: 'status', label: 'Estado' },
    {
      key: 'publishedAt',
      label: 'Publicada',
      format: (value) => (value ? new Date(value as string).toLocaleDateString() : '—'),
    },
  ];

  ngOnInit(): void {
    this.streamingApi.findAll().subscribe({
      next: (events) => this.eventOptions.set(events),
      error: (error: unknown) =>
        this.notifications.apiError(error, 'No se pudieron cargar los eventos disponibles'),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.invitationsApi
      .list({ page: 1, limit: 100, status: this.statusFilter() || undefined })
      .subscribe({
        next: (result) => {
          this.rawInvitations.set(result.data);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(getErrorMessage(error, 'No se pudieron cargar las invitaciones'));
        },
      });
  }

  onStatusFilterChange(value: InvitationStatus | ''): void {
    this.statusFilter.set(value);
    this.load();
  }

  statusBadgeColor(status: InvitationStatus): BadgeColor {
    if (status === InvitationStatus.PUBLISHED) return 'green';
    if (status === InvitationStatus.ARCHIVED) return 'gray';
    return 'yellow';
  }

  openCreate(): void {
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  openDetail(invitation: Invitation): void {
    void this.router.navigate(['/admin/invitations', invitation.id]);
  }

  onSave(submission: InvitationFormSubmission): void {
    if (this.saving()) return;
    this.formError.set('');
    this.saving.set(true);
    const { value } = submission;

    this.invitationsApi
      .create({
        eventId: value.eventId,
        template: value.template,
        message: value.message || undefined,
        accessCodeDisplay: value.accessCodeDisplay || undefined,
      })
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          this.showForm.set(false);
          this.notifications.success('Invitación creada');
          void this.router.navigate(['/admin/invitations', created.id]);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(getErrorMessage(error, 'No se pudo crear la invitación'));
        },
      });
  }
}
