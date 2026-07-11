import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { UserRole } from '@zentic/shared-types';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: jest.Mocked<Reflector>;

  const createContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new TenantGuard(reflector);
  });

  it('allows public routes', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    expect(guard.canActivate(createContext({}))).toBe(true);
  });

  it('returns false when user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    expect(guard.canActivate(createContext({}))).toBe(false);
  });

  it('allows super admin regardless of tenant', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    expect(
      guard.canActivate(
        createContext({ user: { role: UserRole.SUPER_ADMIN } }),
      ),
    ).toBe(true);
  });

  it('attaches tenantId for matching tenant context', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const request: Record<string, unknown> = {
      user: { role: UserRole.TENANT_ADMIN, tenantId: 'tenant-123' },
      resolvedTenantId: 'tenant-123',
    };

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(request.tenantId).toBe('tenant-123');
  });

  it('rejects tenant mismatch', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    expect(() =>
      guard.canActivate(
        createContext({
          user: { role: UserRole.TENANT_ADMIN, tenantId: 'tenant-123' },
          resolvedTenantId: 'tenant-456',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  describe('impersonation (Módulo 04 — Super Admin)', () => {
    it('allows an impersonating super admin and attaches the impersonated tenantId', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const request: Record<string, unknown> = {
        user: {
          role: UserRole.SUPER_ADMIN,
          impersonatedTenantId: 'tenant-123',
        },
        resolvedTenantId: 'tenant-123',
        method: 'GET',
      };

      expect(guard.canActivate(createContext(request))).toBe(true);
      expect(request.tenantId).toBe('tenant-123');
    });

    it('rejects when the resolved tenant does not match the impersonated tenant', () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      expect(() =>
        guard.canActivate(
          createContext({
            user: {
              role: UserRole.SUPER_ADMIN,
              impersonatedTenantId: 'tenant-123',
            },
            resolvedTenantId: 'tenant-456',
            method: 'GET',
          }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('blocks DELETE requests while impersonating', () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      expect(() =>
        guard.canActivate(
          createContext({
            user: {
              role: UserRole.SUPER_ADMIN,
              impersonatedTenantId: 'tenant-123',
            },
            resolvedTenantId: 'tenant-123',
            method: 'DELETE',
          }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('keeps the unconditional bypass for a super admin that is not impersonating (regression)', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const request: Record<string, unknown> = {
        user: { role: UserRole.SUPER_ADMIN },
        method: 'DELETE',
      };

      expect(guard.canActivate(createContext(request))).toBe(true);
      expect(request.tenantId).toBeUndefined();
    });
  });
});
