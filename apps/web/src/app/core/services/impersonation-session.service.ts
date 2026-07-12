import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'impersonation_session';

export interface ImpersonationSessionData {
  token: string;
  tenantSlug: string;
  tenantName: string;
  expiresAt: string;
  impersonationLogId: string;
}

@Injectable({ providedIn: 'root' })
export class ImpersonationSessionService {
  private readonly _session = signal<ImpersonationSessionData | null>(this.restore());

  readonly session = this._session.asReadonly();

  isActive(): boolean {
    const session = this._session();
    if (!session) return false;
    return new Date(session.expiresAt).getTime() > Date.now();
  }

  getToken(): string | null {
    return this.isActive() ? (this._session() as ImpersonationSessionData).token : null;
  }

  start(data: ImpersonationSessionData): void {
    this._session.set(data);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  end(): void {
    this._session.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private restore(): ImpersonationSessionData | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as ImpersonationSessionData;
    } catch {
      return null;
    }
  }
}
