import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  MessageStatus,
  Obituary,
  ObituaryMessage,
  ObituaryStatus,
  PaginatedResponse,
  PublicObituary,
} from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

export interface ObituaryListFilters {
  search?: string;
  status?: ObituaryStatus;
  page?: number;
  limit?: number;
}

export interface ObituaryFormPayload {
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  birthCity?: string;
  deathCity?: string;
  biography?: string;
  epitaph?: string;
  eventId?: string;
  isPublic?: boolean;
  accessCode?: string;
}

export interface ObituaryEventOption {
  id: string;
  slug: string;
  scheduledAt: string;
  status: string;
}

export interface UploadPhotoResult {
  obituary: Obituary;
  lowResolutionWarning: boolean;
}

export interface SubmitCondolenceMessagePayload {
  authorName: string;
  content: string;
  iconType?: string;
  accessCode?: string;
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
export class ObituariesApiService {
  private readonly baseUrl = `${environment.apiUrl}/obituaries`;

  constructor(private readonly http: HttpClient) {}

  list(filters: ObituaryListFilters) {
    return this.http.get<PaginatedResponse<Obituary>>(this.baseUrl, {
      params: toHttpParams(filters),
    });
  }

  get(id: string) {
    return this.http.get<Obituary>(`${this.baseUrl}/${id}`);
  }

  create(payload: ObituaryFormPayload) {
    return this.http.post<Obituary>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<ObituaryFormPayload>) {
    return this.http.patch<Obituary>(`${this.baseUrl}/${id}`, payload);
  }

  publish(id: string) {
    return this.http.post<Obituary>(`${this.baseUrl}/${id}/publish`, {});
  }

  unpublish(id: string) {
    return this.http.post<Obituary>(`${this.baseUrl}/${id}/unpublish`, {});
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listEvents() {
    return this.http.get<ObituaryEventOption[]>(`${this.baseUrl}/meta/events`);
  }

  uploadPhoto(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadPhotoResult>(`${this.baseUrl}/${id}/photo`, formData);
  }

  listMessages(id: string, status?: MessageStatus) {
    return this.http.get<ObituaryMessage[]>(`${this.baseUrl}/${id}/messages`, {
      params: status ? new HttpParams().set('status', status) : undefined,
    });
  }

  approveMessage(id: string, messageId: string) {
    return this.http.patch<ObituaryMessage>(
      `${this.baseUrl}/${id}/messages/${messageId}/approve`,
      {},
    );
  }

  rejectMessage(id: string, messageId: string) {
    return this.http.patch<ObituaryMessage>(
      `${this.baseUrl}/${id}/messages/${messageId}/reject`,
      {},
    );
  }

  downloadBookOfTributes(id: string) {
    return this.http.get(`${this.baseUrl}/${id}/book-of-tributes`, {
      responseType: 'blob',
    });
  }

  // --- Rutas públicas (sin autenticación) — usadas por la página pública del obituario ---

  getPublic(slug: string, accessCode?: string) {
    return this.http.get<PublicObituary>(`${this.baseUrl}/${slug}/public`, {
      params: accessCode ? new HttpParams().set('accessCode', accessCode) : undefined,
    });
  }

  submitMessage(slug: string, payload: SubmitCondolenceMessagePayload) {
    return this.http.post<ObituaryMessage>(`${this.baseUrl}/${slug}/messages`, payload);
  }
}
