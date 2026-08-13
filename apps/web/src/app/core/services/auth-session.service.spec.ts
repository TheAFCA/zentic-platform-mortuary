import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthUser, UserRole } from '@zentic/shared-types';
import { AuthApiService } from './auth-api.service';
import { AuthSessionService } from './auth-session.service';
import { AuthStateService } from './auth-state.service';

describe('AuthSessionService', () => {
  const user: AuthUser = {
    id: 'user-1',
    email: 'admin@example.com',
    role: UserRole.TENANT_ADMIN,
    tenantId: 'tenant-1',
    permissions: ['users:manage'],
    enabledModules: [],
  };

  let authApi: {
    login: (email: string, password: string) => Observable<AuthUser>;
    me: () => Observable<AuthUser | null>;
    logout: () => Observable<void>;
    refresh: () => Observable<AuthUser>;
  };
  let authState: {
    setUser: (user: AuthUser | null) => void;
    clear: () => void;
  };
  let router: {
    navigate: (commands: string[]) => Promise<boolean>;
  };
  let service: AuthSessionService;
  let setUserCalls: Array<AuthUser | null>;
  let clearCalls: number;
  let navigateCalls: string[][];

  beforeEach(() => {
    setUserCalls = [];
    clearCalls = 0;
    navigateCalls = [];

    authApi = {
      login: (email, password) => {
        void email;
        void password;
        return of(user);
      },
      me: () => of(user),
      logout: () => of(void 0),
      refresh: () => of(user),
    };
    authState = {
      setUser: (next) => setUserCalls.push(next),
      clear: () => {
        clearCalls += 1;
      },
    };
    router = {
      navigate: (commands) => {
        navigateCalls.push(commands);
        return Promise.resolve(true);
      },
    };

    TestBed.configureTestingModule({
      providers: [
        AuthSessionService,
        { provide: AuthApiService, useValue: authApi },
        { provide: AuthStateService, useValue: authState },
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(AuthSessionService);
  });

  it('restores session from /auth/me', async () => {
    await service.restoreSession();

    expect(setUserCalls).toEqual([user]);
  });

  it('clears session when restore fails', async () => {
    authApi.me = () => throwError(() => new Error('401'));

    await service.restoreSession();

    expect(setUserCalls).toEqual([null]);
  });

  it('logs in and navigates to the admin dashboard', async () => {
    await service.login('admin@example.com', 'Secret123!');

    expect(setUserCalls).toEqual([user]);
    expect(navigateCalls).toEqual([['/admin/dashboard']]);
  });

  it('logs out and navigates to login even if the API call fails', async () => {
    authApi.logout = () => throwError(() => new Error('401'));

    await expect(service.logout()).rejects.toThrow('401');

    expect(clearCalls).toBe(1);
    expect(navigateCalls).toEqual([['/auth/login']]);
  });

  it('refreshes the session', async () => {
    await expect(service.refreshSession()).resolves.toEqual(user);
    expect(setUserCalls).toEqual([user]);
  });
});
