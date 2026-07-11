import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserRole } from '@zentic/shared-types';
import { PermissionsApiService } from './permissions-api.service';
import { environment } from '../../../environments/environment';

describe('PermissionsApiService', () => {
  let service: PermissionsApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/permissions`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PermissionsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getCatalog() performs a GET against /permissions/catalog', () => {
    service.getCatalog().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/catalog`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getPresets() performs a GET against /permissions/presets', () => {
    service.getPresets().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/presets`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getUserPermissions() performs a GET scoped to the user id', () => {
    service.getUserPermissions('user-1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/users/user-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ userId: 'user-1', role: UserRole.OPERATOR, permissions: [] });
  });

  it('setUserPermissions() performs a PATCH with the requested permissions in the body', () => {
    service.setUserPermissions('user-1', ['leads:read']).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/users/user-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ permissions: ['leads:read'] });
    req.flush({ userId: 'user-1', role: UserRole.OPERATOR, permissions: ['leads:read'] });
  });
});
