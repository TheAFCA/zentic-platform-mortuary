import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  PaginatedResponse,
  Tenant,
  TenantModuleKey,
  TenantPlan,
  TenantStatus,
} from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

export interface TenantListFilters {
  status?: TenantStatus;
  plan?: TenantPlan;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  country?: string;
  adminEmail: string;
  plan: TenantPlan;
  enabledModules?: TenantModuleKey[];
}

export interface UpdateTenantPayload {
  name?: string;
  country?: string;
  plan?: TenantPlan;
}

export interface TenantDetail extends Tenant {
  usage: { users: number; events: number };
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
export class TenantsApiService {
  private readonly baseUrl = `${environment.apiUrl}/super-admin/tenants`;

  constructor(private readonly http: HttpClient) {}

  list(filters: TenantListFilters) {
    return this.http.get<PaginatedResponse<Tenant>>(this.baseUrl, {
      params: toHttpParams(filters),
    });
  }

  get(id: string) {
    return this.http.get<TenantDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateTenantPayload) {
    return this.http.post<Tenant & { adminUserId: string }>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateTenantPayload) {
    return this.http.patch<Tenant>(`${this.baseUrl}/${id}`, payload);
  }

  setModules(id: string, enabledModules: TenantModuleKey[]) {
    return this.http.patch<Tenant>(`${this.baseUrl}/${id}/modules`, { enabledModules });
  }

  suspend(id: string, reason?: string) {
    return this.http.post<Tenant>(`${this.baseUrl}/${id}/suspend`, { reason });
  }

  reactivate(id: string) {
    return this.http.post<Tenant>(`${this.baseUrl}/${id}/reactivate`, {});
  }

  delete(id: string) {
    return this.http.delete<Tenant>(`${this.baseUrl}/${id}`);
  }
}
