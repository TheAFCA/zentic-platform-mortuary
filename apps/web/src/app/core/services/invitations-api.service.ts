import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Invitation,
  InvitationStatus,
  InvitationTemplate,
  PaginatedResponse,
  PublicInvitation,
} from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

export interface InvitationListFilters {
  status?: InvitationStatus;
  eventId?: string;
  page?: number;
  limit?: number;
}

export interface InvitationFormPayload {
  eventId: string;
  template?: InvitationTemplate;
  message?: string;
  accessCodeDisplay?: string;
}

function toHttpParams(filters: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
    if (
      (typeof value === 'string' && value !== '') ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      params = params.set(key, String(value));
    }
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class InvitationsApiService {
  private readonly baseUrl = `${environment.apiUrl}/invitations`;

  constructor(private readonly http: HttpClient) {}

  list(filters: InvitationListFilters) {
    return this.http.get<PaginatedResponse<Invitation>>(this.baseUrl, {
      params: toHttpParams(filters),
    });
  }

  get(id: string) {
    return this.http.get<Invitation>(`${this.baseUrl}/${id}`);
  }

  create(payload: InvitationFormPayload) {
    return this.http.post<Invitation>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Omit<InvitationFormPayload, 'eventId'>>) {
    return this.http.patch<Invitation>(`${this.baseUrl}/${id}`, payload);
  }

  publish(id: string) {
    return this.http.post<Invitation>(`${this.baseUrl}/${id}/publish`, {});
  }

  generateImage(id: string) {
    return this.http.post(`${this.baseUrl}/${id}/image`, {}, { responseType: 'blob' });
  }

  // --- Ruta pública (sin autenticación) — usada por la página pública de la invitación ---

  getPublic(publicUrl: string) {
    return this.http.get<PublicInvitation>(`${this.baseUrl}/${publicUrl}/public`);
  }
}
