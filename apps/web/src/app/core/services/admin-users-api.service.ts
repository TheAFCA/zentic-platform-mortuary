import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Permission } from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

export type ManageableRole = 'OPERATOR' | 'VIEWER';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lockedUntil: string | null;
}

export interface CreateUserPayload {
  email: string;
  role: ManageableRole;
  permissions?: Permission[];
}

export interface UpdateUserPayload {
  role?: ManageableRole;
  permissions?: Permission[];
}

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  constructor(private readonly http: HttpClient) {}

  private readonly baseUrl = `${environment.apiUrl}/admin/users`;

  getUsers() {
    return this.http.get<AdminUser[]>(this.baseUrl);
  }

  createUser(payload: CreateUserPayload) {
    return this.http.post<AdminUser & { permissions: Permission[] }>(this.baseUrl, payload);
  }

  updateUser(id: string, payload: UpdateUserPayload) {
    return this.http.patch(`${this.baseUrl}/${id}`, payload);
  }
}
