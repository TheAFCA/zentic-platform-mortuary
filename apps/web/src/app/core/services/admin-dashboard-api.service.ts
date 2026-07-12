import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AdminDashboardMetrics } from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminDashboardApiService {
  private readonly baseUrl = `${environment.apiUrl}/admin/dashboard`;

  constructor(private readonly http: HttpClient) {}

  get() {
    return this.http.get<AdminDashboardMetrics>(this.baseUrl);
  }
}
