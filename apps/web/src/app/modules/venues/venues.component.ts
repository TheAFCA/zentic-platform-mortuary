import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Room, Venue } from '@zentic/shared-types';
import { VenuesApiService } from '../../core/services/venues-api.service';
import { ConfirmDialogComponent } from '../../shared/organisms/confirm-dialog/confirm-dialog.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { VenueFormComponent, VenueFormValue } from './venue-form/venue-form.component';
import { RoomFormComponent, RoomFormValue } from './room-form/room-form.component';

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
  ],
  templateUrl: './venues.component.html',
  styleUrl: './venues.component.scss',
})
export class VenuesComponent implements OnInit {
  private readonly venuesApi = inject(VenuesApiService);

  readonly venues = signal<Venue[]>([]);
  readonly loading = signal(false);

  readonly showForm = signal(false);
  readonly editingVenue = signal<Venue | null>(null);
  readonly formError = signal('');

  readonly expandedVenueId = signal<string | null>(null);
  readonly showRoomForm = signal(false);
  readonly editingRoom = signal<Room | null>(null);
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
    this.venuesApi.list().subscribe({
      next: (venues) => {
        this.venues.set(venues);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.formError.set('');
    this.editingVenue.set(null);
    this.showForm.set(true);
  }

  openEdit(venue: Venue): void {
    this.formError.set('');
    this.editingVenue.set(venue);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  editingFormValue(): VenueFormValue | null {
    const venue = this.editingVenue();
    if (!venue) return null;
    return { name: venue.name, address: venue.address ?? '' };
  }

  onSave(value: VenueFormValue): void {
    const editing = this.editingVenue();
    this.formError.set('');

    const payload = { name: value.name, address: value.address || undefined };
    const request = editing
      ? this.venuesApi.update(editing.id, payload)
      : this.venuesApi.create(payload);

    request.subscribe({
      next: () => {
        this.showForm.set(false);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(this.extractErrorMessage(error, 'No se pudo guardar la sede'));
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
    this.showRoomForm.set(true);
  }

  openEditRoom(room: Room): void {
    this.roomFormError.set('');
    this.editingRoom.set(room);
    this.showRoomForm.set(true);
  }

  closeRoomForm(): void {
    this.showRoomForm.set(false);
  }

  editingRoomFormValue(): RoomFormValue | null {
    const room = this.editingRoom();
    if (!room) return null;
    return { name: room.name, capacity: room.capacity };
  }

  onSaveRoom(value: RoomFormValue): void {
    const venueId = this.expandedVenueId();
    if (!venueId) return;
    const editing = this.editingRoom();
    this.roomFormError.set('');

    const payload = { name: value.name, capacity: value.capacity ?? undefined };
    const request = editing
      ? this.venuesApi.updateRoom(venueId, editing.id, payload)
      : this.venuesApi.addRoom(venueId, payload);

    request.subscribe({
      next: () => {
        this.showRoomForm.set(false);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.roomFormError.set(this.extractErrorMessage(error, 'No se pudo guardar la sala'));
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
    const action = this.confirmAction();
    this.confirmError.set('');

    if (action === 'delete-venue') {
      const venue = this.confirmVenue();
      if (!venue) return;
      this.venuesApi.delete(venue.id).subscribe({
        next: () => {
          this.cancelConfirm();
          this.load();
        },
        error: (error: HttpErrorResponse) =>
          this.confirmError.set(this.extractErrorMessage(error, 'No se pudo eliminar la sede')),
      });
    } else if (action === 'delete-room') {
      const venueId = this.expandedVenueId();
      const room = this.confirmRoom();
      if (!venueId || !room) return;
      this.venuesApi.deleteRoom(venueId, room.id).subscribe({
        next: () => {
          this.cancelConfirm();
          this.load();
        },
        error: (error: HttpErrorResponse) =>
          this.confirmError.set(this.extractErrorMessage(error, 'No se pudo eliminar la sala')),
      });
    }
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? fallback;
  }
}
