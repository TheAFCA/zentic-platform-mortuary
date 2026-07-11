import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ImpersonationSession } from '@zentic/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ImpersonationApiService {
  constructor(private readonly http: HttpClient) {}

  start(tenantId: string, reason: string) {
    return this.http.post<ImpersonationSession>(
      `${environment.apiUrl}/super-admin/tenants/${tenantId}/impersonate`,
      { reason },
    );
  }

  end(logId: string) {
    return this.http.post<{ ended: boolean }>(
      `${environment.apiUrl}/super-admin/impersonation/${logId}/end`,
      {},
    );
  }
}
