import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Permission, PermissionMeta, PermissionPreset, UserRole } from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

export interface UserPermissionsResponse {
  userId: string;
  role: UserRole;
  permissions: Permission[];
}

@Injectable({ providedIn: 'root' })
export class PermissionsApiService {
  constructor(private readonly http: HttpClient) {}

  private readonly baseUrl = `${environment.apiUrl}/permissions`;

  getCatalog() {
    return this.http.get<Record<string, PermissionMeta[]>>(`${this.baseUrl}/catalog`);
  }

  getPresets() {
    return this.http.get<PermissionPreset[]>(`${this.baseUrl}/presets`);
  }

  getUserPermissions(userId: string) {
    return this.http.get<UserPermissionsResponse>(`${this.baseUrl}/users/${userId}`);
  }

  setUserPermissions(userId: string, permissions: Permission[]) {
    return this.http.patch<UserPermissionsResponse>(`${this.baseUrl}/users/${userId}`, {
      permissions,
    });
  }
}
