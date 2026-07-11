import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuditLogEntry, PaginatedResponse } from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

export interface AuditLogFilters {
  tenantId?: string;
  actorId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
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
export class AuditLogsApiService {
  private readonly baseUrl = `${environment.apiUrl}/super-admin/audit-logs`;

  constructor(private readonly http: HttpClient) {}

  list(filters: AuditLogFilters) {
    return this.http.get<PaginatedResponse<AuditLogEntry>>(this.baseUrl, {
      params: toHttpParams(filters),
    });
  }

  exportCsv(filters: AuditLogFilters) {
    return this.http.get(`${this.baseUrl}/export`, {
      params: toHttpParams(filters),
      responseType: 'blob',
    });
  }
}
