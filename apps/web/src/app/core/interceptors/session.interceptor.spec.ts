import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { ImpersonationSessionService } from '../services/impersonation-session.service';
import { sessionInterceptor } from './session.interceptor';

describe('sessionInterceptor', () => {
  const originalHostname = window.location.hostname;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authState: { setUser: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> };

  const user = { id: 'u1', email: 'admin@demo.test' };

  function setHostname(hostname: string) {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hostname },
      writable: true,
      configurable: true,
    });
  }

  beforeEach(() => {
    router = { navigate: vi.fn().mockResolvedValue(true) };
    authState = { setUser: vi.fn(), clear: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: AuthStateService, useValue: authState },
        { provide: ImpersonationSessionService, useValue: { isActive: () => false } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    setHostname(originalHostname);
  });

  it('shares a single refresh between concurrent 401 responses and retries both', () => {
    const results: unknown[] = [];
    http.get('/api/admin/dashboard').subscribe((body) => results.push(body));
    http.get('/api/tribute-book/messages/pending-count').subscribe((body) => results.push(body));

    httpMock
      .expectOne('/api/admin/dashboard')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne('/api/tribute-book/messages/pending-count')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    httpMock.expectOne('/api/auth/refresh').flush(user);

    httpMock.expectOne('/api/admin/dashboard').flush({ ok: 1 });
    httpMock.expectOne('/api/tribute-book/messages/pending-count').flush({ ok: 2 });

    expect(results).toEqual([{ ok: 1 }, { ok: 2 }]);
    expect(authState.setUser).toHaveBeenCalledWith(user);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('keeps the session when the refresh fails because the API is unavailable', () => {
    let status: number | undefined;
    http
      .get('/api/admin/dashboard')
      .subscribe({ error: (e: { status: number }) => (status = e.status) });

    httpMock
      .expectOne('/api/admin/dashboard')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/auth/refresh').flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(status).toBe(502);
    expect(authState.clear).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('logs out only when the refresh itself is rejected', () => {
    let status: number | undefined;
    http
      .get('/api/admin/dashboard')
      .subscribe({ error: (e: { status: number }) => (status = e.status) });

    httpMock
      .expectOne('/api/admin/dashboard')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne('/api/auth/refresh')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(authState.clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('sends the tenant slug on the refresh request from a tenant subdomain', () => {
    setHostname('demo-funeraria.zentic.pro');
    http.get('/api/admin/dashboard').subscribe();

    httpMock
      .expectOne('/api/admin/dashboard')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    const refresh = httpMock.expectOne('/api/auth/refresh');

    expect(refresh.request.headers.get('x-tenant-slug')).toBe('demo-funeraria');
    refresh.flush(user);
    httpMock.expectOne('/api/admin/dashboard').flush({});
  });
});
