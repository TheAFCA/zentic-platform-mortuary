import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminUsersApiService } from './admin-users-api.service';
import { environment } from '../../../environments/environment';

describe('AdminUsersApiService', () => {
  let service: AdminUsersApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/admin/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminUsersApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getUsers() performs a GET against /admin/users', () => {
    service.getUsers().subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('createUser() performs a POST with the payload', () => {
    const payload = { email: 'new@x.com', role: 'OPERATOR' as const, permissions: ['leads:read' as const] };

    service.createUser(payload).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      id: 'u1',
      email: 'new@x.com',
      role: 'OPERATOR',
      createdAt: new Date().toISOString(),
      lockedUntil: null,
      permissions: ['leads:read'],
    });
  });

  it('updateUser() performs a PATCH scoped to the user id', () => {
    service.updateUser('u1', { role: 'VIEWER' }).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/u1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ role: 'VIEWER' });
    req.flush({});
  });
});
