import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Room, Venue } from '@zentic/shared-types';
import { VenuesApiService } from '../../core/services/venues-api.service';
import { ConfirmDialogComponent } from '../../shared/organisms/confirm-dialog/confirm-dialog.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { VenueFormComponent, VenueFormValue } from './venue-form/venue-form.component';
import { RoomFormComponent, RoomFormValue } from './room-form/room-form.component';
import { FeedbackBannerComponent } from '../../shared/molecules/feedback-banner/feedback-banner.component';
import { FormPanelComponent } from '../../shared/organisms/form-panel/form-panel.component';
import { NotificationService } from '../../core/services/notification.service';
import { getErrorMessage } from '../../core/utils/error-message';

type ConfirmAction = 'delete-venue' | 'delete-room';

@Component({
  selector: 'app-venues',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    ConfirmDialogComponent,
    HasPermissionDirective,
    VenueFormComponent,
    RoomFormComponent,
    FeedbackBannerComponent,
    FormPanelComponent,
  ],
  templateUrl: './venues.component.html',
  styleUrl: './venues.component.scss',
})
export class VenuesComponent implements OnInit {
  private readonly venuesApi = inject(VenuesApiService);
  private readonly notifications = inject(NotificationService);

  readonly venues = signal<Venue[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly savingVenue = signal(false);
  readonly savingRoom = signal(false);
  readonly actionLoading = signal(false);

  readonly showForm = signal(false);
  readonly editingVenue = signal<Venue | null>(null);
  readonly editingFormValue = signal<VenueFormValue | null>(null);
  readonly formError = signal('');

  readonly expandedVenueId = signal<string | null>(null);
  readonly showRoomForm = signal(false);
  readonly editingRoom = signal<Room | null>(null);
  readonly editingRoomFormValue = signal<RoomFormValue | null>(null);
  readonly roomFormError = signal('');

  readonly confirmAction = signal<ConfirmAction | null>(null);
  readonly confirmVenue = signal<Venue | null>(null);
  readonly confirmRoom = signal<Room | null>(null);
  readonly confirmError = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.venuesApi.list().subscribe({
      next: (venues) => {
        this.venues.set(venues);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(error, 'No se pudieron cargar las sedes'));
      },
    });
  }

  openCreate(): void {
    this.formError.set('');
    this.editingVenue.set(null);
    this.editingFormValue.set(null);
    this.showForm.set(true);
  }

  openEdit(venue: Venue): void {
    this.formError.set('');
    this.editingVenue.set(venue);
    this.editingFormValue.set({ name: venue.name, address: venue.address ?? '' });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  onSave(value: VenueFormValue): void {
    if (this.savingVenue()) return;
    const editing = this.editingVenue();
    this.formError.set('');
    this.savingVenue.set(true);

    const payload = { name: value.name, address: value.address || undefined };
    const request = editing
      ? this.venuesApi.update(editing.id, payload)
      : this.venuesApi.create(payload);

    request.subscribe({
      next: () => {
        this.savingVenue.set(false);
        this.showForm.set(false);
        this.notifications.success(editing ? 'Sede actualizada' : 'Sede creada');
        this.load();
      },
      error: (error: unknown) => {
        this.savingVenue.set(false);
        this.formError.set(getErrorMessage(error, 'No se pudo guardar la sede'));
      },
    });
  }

  toggleRooms(venue: Venue): void {
    this.showRoomForm.set(false);
    this.expandedVenueId.set(this.expandedVenueId() === venue.id ? null : venue.id);
  }

  openAddRoom(): void {
    this.roomFormError.set('');
    this.editingRoom.set(null);
    this.editingRoomFormValue.set(null);
    this.showRoomForm.set(true);
  }

  openEditRoom(room: Room): void {
    this.roomFormError.set('');
    this.editingRoom.set(room);
    this.editingRoomFormValue.set({ name: room.name, capacity: room.capacity });
    this.showRoomForm.set(true);
  }

  closeRoomForm(): void {
    this.showRoomForm.set(false);
  }

  onSaveRoom(value: RoomFormValue): void {
    if (this.savingRoom()) return;
    const venueId = this.expandedVenueId();
    if (!venueId) return;
    const editing = this.editingRoom();
    this.roomFormError.set('');
    this.savingRoom.set(true);

    const payload = { name: value.name, capacity: value.capacity ?? undefined };
    const request = editing
      ? this.venuesApi.updateRoom(venueId, editing.id, payload)
      : this.venuesApi.addRoom(venueId, payload);

    request.subscribe({
      next: () => {
        this.savingRoom.set(false);
        this.showRoomForm.set(false);
        this.notifications.success(editing ? 'Sala actualizada' : 'Sala creada');
        this.load();
      },
      error: (error: unknown) => {
        this.savingRoom.set(false);
        this.roomFormError.set(getErrorMessage(error, 'No se pudo guardar la sala'));
      },
    });
  }

  askDeleteVenue(venue: Venue): void {
    this.confirmVenue.set(venue);
    this.confirmAction.set('delete-venue');
    this.confirmError.set('');
  }

  askDeleteRoom(room: Room): void {
    this.confirmRoom.set(room);
    this.confirmAction.set('delete-room');
    this.confirmError.set('');
  }

  cancelConfirm(): void {
    this.confirmAction.set(null);
    this.confirmVenue.set(null);
    this.confirmRoom.set(null);
  }

  confirmDialogTitle(): string {
    return this.confirmAction() === 'delete-venue' ? 'Eliminar sede' : 'Eliminar sala';
  }

  confirmDialogMessage(): string {
    if (this.confirmAction() === 'delete-venue') {
      return `Esta acción marcará "${this.confirmVenue()?.name}" como eliminada. Si tiene eventos activos asociados, no se podrá eliminar.`;
    }
    return `Esta acción marcará "${this.confirmRoom()?.name}" como eliminada. Si tiene eventos activos asociados, no se podrá eliminar.`;
  }

  onConfirm(): void {
    if (this.actionLoading()) return;
    const action = this.confirmAction();
    this.confirmError.set('');

    if (action === 'delete-venue') {
      const venue = this.confirmVenue();
      if (!venue) return;
      this.actionLoading.set(true);
      this.venuesApi.delete(venue.id).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.cancelConfirm();
          this.notifications.success('Sede eliminada');
          this.load();
        },
        error: (error: unknown) => {
          this.actionLoading.set(false);
          this.confirmError.set(getErrorMessage(error, 'No se pudo eliminar la sede'));
        },
      });
    } else if (action === 'delete-room') {
      const venueId = this.expandedVenueId();
      const room = this.confirmRoom();
      if (!venueId || !room) return;
      this.actionLoading.set(true);
      this.venuesApi.deleteRoom(venueId, room.id).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.cancelConfirm();
          this.notifications.success('Sala eliminada');
          this.load();
        },
        error: (error: unknown) => {
          this.actionLoading.set(false);
          this.confirmError.set(getErrorMessage(error, 'No se pudo eliminar la sala'));
        },
      });
    }
  }
}
