import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EventStatus } from '@zentic/shared-types';

/**
 * Representa un evento de streaming completo desde la API.
 */
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

/**
 * Datos públicos del evento expuestos a la página del viewer sin autenticación.
 */
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

/**
 * Mensaje de homenaje de un evento.
 */
export interface Message {
  id: string;
  authorName: string;
  content: string;
  iconType: string | null;
  status: string;
  createdAt: string;
  rejectedReason?: string | null;
}

/**
 * Datos de entrada para crear un nuevo evento desde el formulario.
 */
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

/**
 * Datos para enviar un mensaje de homenaje.
 */
export interface SendMessageInput {
  authorName: string;
  content: string;
  iconType?: string;
}

/**
 * Datos para enviar una reacción rápida.
 */
export interface SendReactionInput {
  type: string;
}

/**
 * Datos para validar un código de acceso.
 */
export interface AccessCodeInput {
  code: string;
  name?: string;
  email?: string;
  consent?: boolean;
}

/**
 * Servicio HTTP para el módulo de Streaming.
 *
 * Proporciona métodos tipados para todas las operaciones CRUD de eventos,
 * control de transmisión, mensajes, reacciones y validación de acceso.
 * Todos los métodos públicos (slug) no requieren autenticación.
 */
@Injectable({ providedIn: 'root' })
export class StreamingApiService {
  constructor(private readonly http: HttpClient) {}

  /** Obtiene todos los eventos del tenant autenticado */
  findAll() {
    return this.http.get<StreamingEvent[]>(`${environment.apiUrl}/events`);
  }

  /** Obtiene el detalle completo de un evento por ID */
  findOne(id: string) {
    return this.http.get<StreamingEvent>(`${environment.apiUrl}/events/${id}`);
  }

  /** Obtiene datos públicos de un evento por slug (sin auth) */
  findPublic(slug: string) {
    return this.http.get<PublicEvent>(`${environment.apiUrl}/events/${slug}/public`);
  }

  /** Crea un nuevo evento de streaming */
  create(dto: CreateEventInput) {
    return this.http.post<StreamingEvent>(`${environment.apiUrl}/events`, dto);
  }

  /** Actualiza un evento existente */
  update(id: string, dto: Partial<CreateEventInput>) {
    return this.http.patch<StreamingEvent>(`${environment.apiUrl}/events/${id}`, dto);
  }

  /** Cancela un evento (soft-delete) */
  remove(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/events/${id}`);
  }

  /** Inicia la transmisión en vivo */
  startStream(id: string) {
    return this.http.post<StreamingEvent>(`${environment.apiUrl}/events/${id}/start`, {});
  }

  /** Finaliza la transmisión en vivo */
  stopStream(id: string) {
    return this.http.post<StreamingEvent>(`${environment.apiUrl}/events/${id}/stop`, {});
  }

  /** Obtiene los mensajes aprobados de un evento */
  getMessages(id: string) {
    return this.http.get<Message[]>(`${environment.apiUrl}/events/${id}/messages`);
  }

  /** Obtiene los mensajes pendientes de moderación */
  getPendingMessages(id: string) {
    return this.http.get<Message[]>(`${environment.apiUrl}/events/${id}/messages/pending`);
  }

  /** Envía un mensaje de homenaje a un evento público */
  sendMessage(slug: string, dto: SendMessageInput) {
    return this.http.post<Message>(`${environment.apiUrl}/events/${slug}/messages`, dto);
  }

  /** Aprueba un mensaje pendiente */
  approveMessage(eventId: string, messageId: string) {
    return this.http.patch<Message>(
      `${environment.apiUrl}/events/${eventId}/messages/${messageId}/approve`,
      {},
    );
  }

  /** Rechaza un mensaje pendiente */
  rejectMessage(eventId: string, messageId: string, reason?: string) {
    return this.http.patch<Message>(
      `${environment.apiUrl}/events/${eventId}/messages/${messageId}/reject`,
      { reason },
    );
  }

  /** Elimina un mensaje (soft-delete) */
  deleteMessage(eventId: string, messageId: string) {
    return this.http.delete<void>(
      `${environment.apiUrl}/events/${eventId}/messages/${messageId}`,
    );
  }

  /** Envía una reacción rápida durante un evento en vivo */
  sendReaction(slug: string, dto: SendReactionInput) {
    return this.http.post<{ sent: boolean }>(
      `${environment.apiUrl}/events/${slug}/reactions`,
      dto,
    );
  }

  /** Valida el código de acceso de un evento privado */
  validateAccessCode(slug: string, dto: AccessCodeInput) {
    return this.http.post<{ valid: boolean; eventId: string }>(
      `${environment.apiUrl}/events/${slug}/access`,
      dto,
    );
  }
}
