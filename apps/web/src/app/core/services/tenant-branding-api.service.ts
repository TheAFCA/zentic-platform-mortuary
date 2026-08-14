import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface TenantBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

/** Marca del tenant para pantallas previas a la autenticación (ej. login). */
@Injectable({ providedIn: 'root' })
export class TenantBrandingApiService {
  private readonly http = inject(HttpClient);

  getBranding() {
    return this.http.get<TenantBranding | null>(`${environment.apiUrl}/tenant/branding`);
  }
}
