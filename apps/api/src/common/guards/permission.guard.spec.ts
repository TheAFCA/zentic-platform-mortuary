import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { UserRole } from '@zentic/shared-types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

const createContext = (request: Record<string, unknown> = {}) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new PermissionGuard(reflector);
  });

  it('allows public routes', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === IS_PUBLIC_KEY ? true : undefined,
    );

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows routes without required permissions', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('bypasses checks for tenant admins and super admins', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === PERMISSION_KEY ? ['users:manage'] : undefined,
    );

    expect(
      guard.canActivate(
        createContext({ user: { role: UserRole.SUPER_ADMIN } }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        createContext({ user: { role: UserRole.TENANT_ADMIN } }),
      ),
    ).toBe(true);
  });

  it('allows users with the required permission', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === PERMISSION_KEY ? ['users:manage'] : undefined,
    );

    expect(
      guard.canActivate(
        createContext({
          user: { role: UserRole.OPERATOR, permissions: ['users:manage'] },
        }),
      ),
    ).toBe(true);
  });

  it('rejects users without the required permission', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === PERMISSION_KEY ? ['users:manage', 'settings:manage'] : undefined,
    );

    expect(() =>
      guard.canActivate(
        createContext({ user: { role: UserRole.OPERATOR, permissions: [] } }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('returns false when user is missing', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === PERMISSION_KEY ? ['users:manage'] : undefined,
    );

    expect(guard.canActivate(createContext())).toBe(false);
  });
});
