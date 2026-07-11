import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EventStatus } from '@zentic/shared-types';

export interface StreamingEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  ceremonyType: string;
  status: EventStatus;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  estimatedDuration: number | null;
  isPublic: boolean;
  accessCode: string | null;
  streamKey: string | null;
  rtmpUrl: string | null;
  recordingUrl: string | null;
  viewerCount: number;
  moderationMode: string;
  createdAt: string;
  deceased: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    deathDate: string | null;
    photoUrl: string | null;
    biography: string | null;
    epitaph: string | null;
  };
  room: {
    id: string;
    name: string;
    venue: { name: string };
  } | null;
  _count?: {
    messages: number;
    leads: number;
  };
}

export interface PublicEvent {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  ceremonyType: string;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  recordingUrl: string | null;
  isPublic: boolean;
  viewerCount: number;
  deceased: {
    firstName: string;
    lastName: string;
    birthDate: string | null;
    deathDate: string | null;
    photoUrl: string | null;
    biography: string | null;
    epitaph: string | null;
  } | null;
  tenant: {
    name: string;
    brandConfig: {
      logoUrl: string | null;
      primaryColor: string;
      secondaryColor: string;
      textColor: string;
      backgroundColor: string;
    } | null;
  };
}

export interface Message {
  id: string;
  authorName: string;
  content: string;
  iconType: string | null;
  status: string;
  createdAt: string;
  rejectedReason?: string | null;
}

export interface CreateEventInput {
  title: string;
  deceasedId?: string;
  deceased?: {
    firstName: string;
    lastName: string;
    birthDate?: string;
    deathDate?: string;
    photoUrl?: string;
    biography?: string;
    epitaph?: string;
  };
  roomId?: string;
  clientId?: string;
  description?: string;
  ceremonyType: string;
  scheduledAt: string;
  estimatedDuration?: number;
  isPublic?: boolean;
  accessCode?: string;
  moderationMode?: string;
}

export interface SendMessageInput {
  authorName: string;
  content: string;
  iconType?: string;
}

export interface SendReactionInput {
  type: string;
}

export interface AccessCodeInput {
  code: string;
  name?: string;
  email?: string;
  consent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class StreamingApiService {
  constructor(private readonly http: HttpClient) {}

  findAll() {
    return this.http.get<StreamingEvent[]>(`${environment.apiUrl}/events`);
  }

  findOne(id: string) {
    return this.http.get<StreamingEvent>(`${environment.apiUrl}/events/${id}`);
  }

  findPublic(slug: string) {
    return this.http.get<PublicEvent>(`${environment.apiUrl}/events/${slug}/public`);
  }

  create(dto: CreateEventInput) {
    return this.http.post<StreamingEvent>(`${environment.apiUrl}/events`, dto);
  }

  update(id: string, dto: Partial<CreateEventInput>) {
    return this.http.patch<StreamingEvent>(`${environment.apiUrl}/events/${id}`, dto);
  }

  remove(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/events/${id}`);
  }

  startStream(id: string) {
    return this.http.post<StreamingEvent>(`${environment.apiUrl}/events/${id}/start`, {});
  }

  stopStream(id: string) {
    return this.http.post<StreamingEvent>(`${environment.apiUrl}/events/${id}/stop`, {});
  }

  getMessages(id: string) {
    return this.http.get<Message[]>(`${environment.apiUrl}/events/${id}/messages`);
  }

  getPendingMessages(id: string) {
    return this.http.get<Message[]>(`${environment.apiUrl}/events/${id}/messages/pending`);
  }

  sendMessage(slug: string, dto: SendMessageInput) {
    return this.http.post<Message>(`${environment.apiUrl}/events/${slug}/messages`, dto);
  }

  approveMessage(eventId: string, messageId: string) {
    return this.http.patch<Message>(
      `${environment.apiUrl}/events/${eventId}/messages/${messageId}/approve`,
      {},
    );
  }

  rejectMessage(eventId: string, messageId: string, reason?: string) {
    return this.http.patch<Message>(
      `${environment.apiUrl}/events/${eventId}/messages/${messageId}/reject`,
      { reason },
    );
  }

  deleteMessage(eventId: string, messageId: string) {
    return this.http.delete<void>(`${environment.apiUrl}/events/${eventId}/messages/${messageId}`);
  }

  sendReaction(slug: string, dto: SendReactionInput) {
    return this.http.post<{ sent: boolean }>(`${environment.apiUrl}/events/${slug}/reactions`, dto);
  }

  validateAccessCode(slug: string, dto: AccessCodeInput) {
    return this.http.post<{ valid: boolean; eventId: string }>(
      `${environment.apiUrl}/events/${slug}/access`,
      dto,
    );
  }
}
