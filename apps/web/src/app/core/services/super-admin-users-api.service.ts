import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface SuperAdminUser {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminUsersApiService {
  private readonly baseUrl = `${environment.apiUrl}/super-admin/users`;

  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get<SuperAdminUser[]>(this.baseUrl);
  }

  create(email: string) {
    return this.http.post<SuperAdminUser>(this.baseUrl, { email });
  }

  setActive(id: string, active: boolean) {
    return this.http.patch<SuperAdminUser>(`${this.baseUrl}/${id}`, { active });
  }
}
