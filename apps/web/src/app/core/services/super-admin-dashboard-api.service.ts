import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuditLogEntry } from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

export interface SuperAdminDashboard {
  tenants: { active: number; suspended: number; trial: number };
  liveEvents: number;
  obituariesPublishedToday: number;
  obituariesPublishedThisWeek: number;
  totalUsers: number;
  recentAuditLogs: AuditLogEntry[];
}

@Injectable({ providedIn: 'root' })
export class SuperAdminDashboardApiService {
  constructor(private readonly http: HttpClient) {}

  get() {
    return this.http.get<SuperAdminDashboard>(`${environment.apiUrl}/super-admin/dashboard`);
  }
}
