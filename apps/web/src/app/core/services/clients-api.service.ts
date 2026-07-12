import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Client, ClientStatus, PaginatedResponse } from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

export interface ClientListFilters {
  search?: string;
  status?: ClientStatus;
  page?: number;
  limit?: number;
}

export interface CreateClientPayload {
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  notes?: string;
  status?: ClientStatus;
  serviceDate?: string;
  convertedFrom?: string;
}

export type UpdateClientPayload = Partial<Omit<CreateClientPayload, 'convertedFrom'>>;

export interface ClientEvent {
  id: string;
  slug: string;
  status: string;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ClientDetail extends Client {
  events: ClientEvent[];
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
export class ClientsApiService {
  private readonly baseUrl = `${environment.apiUrl}/admin/clients`;

  constructor(private readonly http: HttpClient) {}

  list(filters: ClientListFilters) {
    return this.http.get<PaginatedResponse<Client>>(this.baseUrl, {
      params: toHttpParams(filters),
    });
  }

  get(id: string) {
    return this.http.get<ClientDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateClientPayload) {
    return this.http.post<Client>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateClientPayload) {
    return this.http.patch<Client>(`${this.baseUrl}/${id}`, payload);
  }

  exportCsv(filters: Pick<ClientListFilters, 'search' | 'status'>) {
    return this.http.get(`${this.baseUrl}/export`, {
      params: toHttpParams(filters),
      responseType: 'blob',
    });
  }
}
