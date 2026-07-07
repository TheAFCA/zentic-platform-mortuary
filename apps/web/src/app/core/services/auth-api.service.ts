import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthUser } from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<AuthUser>(`${environment.apiUrl}/auth/login`, {
      email,
      password,
    });
  }

  me() {
    return this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`);
  }

  logout() {
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, {});
  }

  refresh() {
    return this.http.post<AuthUser>(`${environment.apiUrl}/auth/refresh`, {});
  }
}
