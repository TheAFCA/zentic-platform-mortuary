import { TestBed } from '@angular/core/testing';
import { ImpersonationSessionService } from './impersonation-session.service';

describe('ImpersonationSessionService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('is inactive when there is no stored session', () => {
    const service = TestBed.inject(ImpersonationSessionService);

    expect(service.isActive()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('becomes active after start() and persists to sessionStorage', () => {
    const service = TestBed.inject(ImpersonationSessionService);
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    service.start({
      token: 'abc',
      tenantSlug: 'demo',
      tenantName: 'Demo',
      expiresAt,
      impersonationLogId: 'log-1',
    });

    expect(service.isActive()).toBe(true);
    expect(service.getToken()).toBe('abc');
    expect(sessionStorage.getItem('impersonation_session')).toContain('abc');
  });

  it('is inactive when the stored session is already expired', () => {
    const service = TestBed.inject(ImpersonationSessionService);

    service.start({
      token: 'abc',
      tenantSlug: 'demo',
      tenantName: 'Demo',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      impersonationLogId: 'log-1',
    });

    expect(service.isActive()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('end() clears the session and sessionStorage', () => {
    const service = TestBed.inject(ImpersonationSessionService);
    service.start({
      token: 'abc',
      tenantSlug: 'demo',
      tenantName: 'Demo',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      impersonationLogId: 'log-1',
    });

    service.end();

    expect(service.isActive()).toBe(false);
    expect(sessionStorage.getItem('impersonation_session')).toBeNull();
  });
});
