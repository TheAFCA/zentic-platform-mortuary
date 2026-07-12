import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TenantAccountSettings, TenantBrandConfig } from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

export type UpdateSettingsPayload = Partial<TenantAccountSettings>;
export type UpdateBrandPayload = Partial<
  Pick<TenantBrandConfig, 'primaryColor' | 'secondaryColor' | 'textColor' | 'backgroundColor'>
>;

@Injectable({ providedIn: 'root' })
export class AdminSettingsApiService {
  private readonly baseUrl = `${environment.apiUrl}/admin/settings`;

  constructor(private readonly http: HttpClient) {}

  getSettings() {
    return this.http.get<TenantAccountSettings>(this.baseUrl);
  }

  updateSettings(payload: UpdateSettingsPayload) {
    return this.http.patch<TenantAccountSettings>(this.baseUrl, payload);
  }

  getBrand() {
    return this.http.get<TenantBrandConfig>(`${this.baseUrl}/brand`);
  }

  updateBrand(payload: UpdateBrandPayload) {
    return this.http.patch<TenantBrandConfig>(`${this.baseUrl}/brand`, payload);
  }

  uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TenantBrandConfig>(`${this.baseUrl}/brand/logo`, formData);
  }

  uploadFavicon(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TenantBrandConfig>(`${this.baseUrl}/brand/favicon`, formData);
  }
}
