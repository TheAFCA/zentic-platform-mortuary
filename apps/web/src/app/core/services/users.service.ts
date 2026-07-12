import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lockedUntil: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly baseUrl = `${environment.apiUrl}/admin/users`;

  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get<AdminUser[]>(this.baseUrl);
  }
}
