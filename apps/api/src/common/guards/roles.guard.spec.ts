import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from './roles.guard';
import { UserRole } from '@zentic/shared-types';

const createContext = (request: Record<string, unknown> = {}) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('allows routes without required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('returns false when user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.SUPER_ADMIN]);

    expect(guard.canActivate(createContext())).toBe(false);
  });

  it('allows matching roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TENANT_ADMIN]);

    expect(
      guard.canActivate(
        createContext({ user: { role: UserRole.TENANT_ADMIN } }),
      ),
    ).toBe(true);
  });

  it('rejects non matching roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.SUPER_ADMIN]);

    expect(() =>
      guard.canActivate(createContext({ user: { role: UserRole.OPERATOR } })),
    ).toThrow(ForbiddenException);
  });
});
