import {
  BadRequestException,
  ForbiddenException,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  hashPassword,
  verifyPassword,
} from '../../common/security/password.util';
import { TenantStatus, UserRole } from '@zentic/shared-types';

jest.mock('../../common/security/password.util', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

const mockedHashPassword = hashPassword as jest.MockedFunction<
  typeof hashPassword
>;
const mockedVerifyPassword = verifyPassword as jest.MockedFunction<
  typeof verifyPassword
>;

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: any;
  let jwtService: any;
  let config: any;

  const createRequest = (overrides: Record<string, unknown> = {}) =>
    ({
      resolvedTenantId: 'tenant-1',
      tenantId: 'tenant-1',
      cookies: {},
      get: jest.fn().mockReturnValue('test-agent'),
      ip: '127.0.0.1',
      ...overrides,
    }) as any;

  const createResponse = () =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as any;

  const createTenantUser = () => ({
    id: 'user-1',
    email: 'tenant@example.com',
    passwordHash: 'stored-hash',
    role: UserRole.TENANT_ADMIN,
    tenantId: 'tenant-1',
    tenant: { status: TenantStatus.ACTIVE },
    lockedUntil: null,
    loginAttempts: 0,
    permissions: [{ permission: 'users:manage' }],
  });

  const createSuperAdmin = () => ({
    id: 'admin-1',
    email: 'superadmin@zentic.pro',
    passwordHash: 'admin-hash',
    role: UserRole.SUPER_ADMIN,
    tenantId: null,
    tenant: null,
    lockedUntil: null,
    loginAttempts: 0,
    permissions: [],
  });

  beforeEach(() => {
    authRepository = {
      findUserForLogin: jest.fn(),
      findUserById: jest.fn(),
      findSessionById: jest.fn(),
      createSession: jest.fn(),
      updateSessionRefreshToken: jest.fn(),
      revokeSession: jest.fn(),
      revokeUserSessions: jest.fn(),
      updateLoginState: jest.fn(),
      updatePasswordHash: jest.fn(),
      incrementLoginAttempts: jest.fn(),
    };

    jwtService = {
      sign: jest.fn(),
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    config = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          NODE_ENV: 'development',
          JWT_ACCESS_EXPIRES_IN: '90000',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return values[key] ?? fallback ?? '';
      }),
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_REFRESH_SECRET: 'refresh-secret-refresh-secret-refresh-secret',
          JWT_SECRET: 'jwt-secret-jwt-secret-jwt-secret-jwt',
        };
        return values[key];
      }),
    };

    service = new AuthService(authRepository, jwtService, config);

    mockedHashPassword.mockReset();
    mockedVerifyPassword.mockReset();
    jwtService.sign.mockReturnValue('access-token');
    jwtService.signAsync.mockResolvedValue('refresh-token');
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'tenant@example.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      permissions: ['users:manage'],
      sid: 'session-1',
      type: 'refresh',
    } as any);
    mockedHashPassword.mockResolvedValue('hashed-token');
    mockedVerifyPassword.mockResolvedValue(true);
  });

  it('logs in tenant users and issues cookies', async () => {
    authRepository.findUserForLogin.mockResolvedValue(
      createTenantUser() as any,
    );

    const req = createRequest();
    const res = createResponse();

    const result = await service.login(
      'tenant@example.com',
      'Secret123!',
      req,
      res,
    );

    expect(result).toEqual({
      id: 'user-1',
      email: 'tenant@example.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      permissions: ['users:manage'],
    });
    expect(authRepository.updateLoginState).toHaveBeenCalledWith('user-1', {
      loginAttempts: 0,
      lockedUntil: null,
    });
    expect(authRepository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        refreshTokenHash: 'hashed-token',
        device: 'test-agent',
        ipAddress: '127.0.0.1',
      }),
    );
    expect(res.cookie).toHaveBeenCalledTimes(2);
  });

  it('allows super admins without tenant context', async () => {
    authRepository.findUserForLogin.mockResolvedValue(
      createSuperAdmin() as any,
    );
    const req = createRequest({
      resolvedTenantId: undefined,
      tenantId: undefined,
    });
    const res = createResponse();

    await expect(
      service.login('superadmin@zentic.pro', 'Secret123!', req, res),
    ).resolves.toEqual(
      expect.objectContaining({ role: UserRole.SUPER_ADMIN, tenantId: null }),
    );
  });

  it('rejects invalid credentials', async () => {
    authRepository.findUserForLogin.mockResolvedValue(null);

    await expect(
      service.login(
        'missing@example.com',
        'Secret123!',
        createRequest(),
        createResponse(),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('locks users after repeated failed attempts', async () => {
    authRepository.findUserForLogin.mockResolvedValue({
      ...createTenantUser(),
      loginAttempts: 4,
    } as any);
    mockedVerifyPassword.mockResolvedValue(false);

    await expect(
      service.login(
        'tenant@example.com',
        'Wrong123!',
        createRequest(),
        createResponse(),
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(authRepository.incrementLoginAttempts).toHaveBeenCalledWith(
      'user-1',
      expect.any(Date),
    );
  });

  it('rejects login for inactive tenants', async () => {
    authRepository.findUserForLogin.mockResolvedValue({
      ...createTenantUser(),
      tenant: { status: TenantStatus.SUSPENDED },
    } as any);

    await expect(
      service.login(
        'tenant@example.com',
        'Secret123!',
        createRequest(),
        createResponse(),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws when account is locked', async () => {
    authRepository.findUserForLogin.mockResolvedValue({
      ...createTenantUser(),
      lockedUntil: new Date(Date.now() + 60_000),
    } as any);

    await expect(
      service.login(
        'tenant@example.com',
        'Secret123!',
        createRequest(),
        createResponse(),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('logs out and clears cookies', async () => {
    const req = createRequest({
      cookies: { refresh_token: 'refresh-token' },
    });
    const res = createResponse();

    await service.logout(req, res);

    expect(authRepository.revokeSession).toHaveBeenCalledWith('session-1');
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });

  it('refreshes tokens for the current session', async () => {
    authRepository.findSessionById.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'stored-refresh-hash',
      device: 'test-agent',
      ipAddress: '127.0.0.1',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60_000),
      user: createTenantUser() as any,
    } as any);
    mockedVerifyPassword.mockResolvedValue(true);
    jwtService.sign.mockReturnValue('new-access-token');
    jwtService.signAsync.mockResolvedValue('new-refresh-token');
    mockedHashPassword.mockResolvedValue('new-refresh-hash');

    const result = await service.refresh(
      createRequest({ cookies: { refresh_token: 'refresh-token' } }),
      createResponse(),
    );

    expect(result).toEqual(
      expect.objectContaining({ id: 'user-1', tenantId: 'tenant-1' }),
    );
    expect(authRepository.updateSessionRefreshToken).toHaveBeenCalledWith(
      'session-1',
      'new-refresh-hash',
      expect.any(Date),
    );
  });

  it('rejects refreshes with tenant mismatch', async () => {
    authRepository.findSessionById.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'stored-refresh-hash',
      device: 'test-agent',
      ipAddress: '127.0.0.1',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60_000),
      user: createTenantUser() as any,
    } as any);
    mockedVerifyPassword.mockResolvedValue(true);

    await expect(
      service.refresh(
        createRequest({
          resolvedTenantId: 'tenant-2',
          cookies: { refresh_token: 'refresh-token' },
        }),
        createResponse(),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws when refresh token is missing', async () => {
    await expect(
      service.refresh(createRequest({ cookies: {} }), createResponse()),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns the current user', async () => {
    authRepository.findUserById.mockResolvedValue(createTenantUser() as any);

    await expect(
      service.me({
        sub: 'user-1',
        email: 'tenant@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-1',
        permissions: ['users:manage'],
      }),
    ).resolves.toEqual(
      expect.objectContaining({ id: 'user-1', role: UserRole.TENANT_ADMIN }),
    );
  });

  it('changes passwords and revokes active sessions', async () => {
    authRepository.findUserById.mockResolvedValue(createTenantUser() as any);
    mockedVerifyPassword.mockResolvedValue(true);
    mockedHashPassword.mockResolvedValue('new-password-hash');

    await service.changePassword('user-1', 'Secret123!', 'NewSecret123!');

    expect(authRepository.updatePasswordHash).toHaveBeenCalledWith(
      'user-1',
      'new-password-hash',
    );
    expect(authRepository.revokeUserSessions).toHaveBeenCalledWith('user-1');
  });

  it('rejects weak new passwords', async () => {
    await expect(
      service.changePassword('user-1', 'Secret123!', 'short'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid current passwords', async () => {
    authRepository.findUserById.mockResolvedValue(createTenantUser() as any);
    mockedVerifyPassword.mockResolvedValue(false);

    await expect(
      service.changePassword('user-1', 'Wrong123!', 'NewSecret123!'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws for forgot and reset password stubs', async () => {
    await expect(service.forgotPassword('tenant@example.com')).rejects.toThrow(
      NotImplementedException,
    );
    await expect(
      service.resetPassword('token', 'NewSecret123!'),
    ).rejects.toThrow(NotImplementedException);
  });
});
