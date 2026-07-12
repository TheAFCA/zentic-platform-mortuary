import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Room, Venue } from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

export interface CreateVenuePayload {
  name: string;
  address?: string;
}

export type UpdateVenuePayload = Partial<CreateVenuePayload>;

export interface CreateRoomPayload {
  name: string;
  capacity?: number;
}

export type UpdateRoomPayload = Partial<CreateRoomPayload>;

@Injectable({ providedIn: 'root' })
export class VenuesApiService {
  private readonly baseUrl = `${environment.apiUrl}/admin/venues`;

  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get<Venue[]>(this.baseUrl);
  }

  create(payload: CreateVenuePayload) {
    return this.http.post<Venue>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateVenuePayload) {
    return this.http.patch<Venue>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  addRoom(venueId: string, payload: CreateRoomPayload) {
    return this.http.post<Room>(`${this.baseUrl}/${venueId}/rooms`, payload);
  }

  updateRoom(venueId: string, roomId: string, payload: UpdateRoomPayload) {
    return this.http.patch<Room>(`${this.baseUrl}/${venueId}/rooms/${roomId}`, payload);
  }

  deleteRoom(venueId: string, roomId: string) {
    return this.http.delete<void>(`${this.baseUrl}/${venueId}/rooms/${roomId}`);
  }
}
