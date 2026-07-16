import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BulkApproveTributeMessagesInput,
  GenerateTributeBookInput,
  ListTributeMessagesQuery,
  MessageOrigin,
  PaginatedResponse,
  TributeBookGeneration,
  TributeMessage,
} from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

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
export class TributeBookApiService {
  private readonly baseUrl = `${environment.apiUrl}/tribute-book`;

  constructor(private readonly http: HttpClient) {}

  listMessages(query: ListTributeMessagesQuery) {
    return this.http.get<PaginatedResponse<TributeMessage>>(`${this.baseUrl}/messages`, {
      params: toHttpParams(query),
    });
  }

  pendingCount() {
    return this.http.get<{ count: number }>(`${this.baseUrl}/messages/pending-count`);
  }

  approve(id: string, origin: MessageOrigin) {
    return this.http.patch<TributeMessage>(`${this.baseUrl}/messages/${id}/approve`, { origin });
  }

  reject(id: string, origin: MessageOrigin, rejectedReason?: string) {
    return this.http.patch<TributeMessage>(`${this.baseUrl}/messages/${id}/reject`, {
      origin,
      rejectedReason,
    });
  }

  bulkApprove(input: BulkApproveTributeMessagesInput) {
    return this.http.post<{ approved: number }>(`${this.baseUrl}/messages/bulk-approve`, input);
  }

  softDelete(id: string, origin: MessageOrigin) {
    return this.http.delete<void>(`${this.baseUrl}/messages/${id}`, {
      params: new HttpParams().set('origin', origin),
    });
  }

  restore(id: string, origin: MessageOrigin) {
    return this.http.post<void>(
      `${this.baseUrl}/messages/${id}/restore`,
      {},
      { params: new HttpParams().set('origin', origin) },
    );
  }

  generate(input: GenerateTributeBookInput) {
    return this.http.post<TributeBookGeneration>(`${this.baseUrl}/generate`, input);
  }

  history(page = 1, limit = 25) {
    return this.http.get<PaginatedResponse<TributeBookGeneration>>(`${this.baseUrl}/history`, {
      params: toHttpParams({ page, limit }),
    });
  }

  download(generationId: string) {
    return this.http.get(`${this.baseUrl}/${generationId}/download`, {
      responseType: 'blob',
    });
  }
}
