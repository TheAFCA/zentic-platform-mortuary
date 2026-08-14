import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantModuleGuard } from './tenant-module.guard';
import { UserRole } from '@zentic/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

describe('TenantModuleGuard', () => {
  let guard: TenantModuleGuard;
  let reflector: jest.Mocked<Reflector>;
  let prisma: { tenantFeatureFlag: { findUnique: jest.Mock } };

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
    prisma = { tenantFeatureFlag: { findUnique: jest.fn() } };
    guard = new TenantModuleGuard(
      reflector,
      prisma as unknown as PrismaService,
    );
  });

  it('allows public routes without checking metadata further', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(prisma.tenantFeatureFlag.findUnique).not.toHaveBeenCalled();
  });

  it('allows routes without @RequireModule metadata', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(prisma.tenantFeatureFlag.findUnique).not.toHaveBeenCalled();
  });

  it('returns false when user is missing', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('leads');

    await expect(guard.canActivate(createContext({}))).resolves.toBe(false);
  });

  it('allows a non-impersonating super admin without checking the flag', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('leads');
    const request = {
      user: { role: UserRole.SUPER_ADMIN },
      tenantId: 'tenant-123',
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(prisma.tenantFeatureFlag.findUnique).not.toHaveBeenCalled();
  });

  it('does NOT bypass for TENANT_ADMIN (unlike PermissionGuard)', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('leads');
    prisma.tenantFeatureFlag.findUnique.mockResolvedValue(null);
    const request = {
      user: { role: UserRole.TENANT_ADMIN, tenantId: 'tenant-123' },
      tenantId: 'tenant-123',
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.tenantFeatureFlag.findUnique).toHaveBeenCalledWith({
      where: { tenantId_feature: { tenantId: 'tenant-123', feature: 'leads' } },
    });
  });

  it('checks the impersonated tenant flag when a super admin is impersonating', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('leads');
    prisma.tenantFeatureFlag.findUnique.mockResolvedValue({ enabled: false });
    const request = {
      user: { role: UserRole.SUPER_ADMIN, impersonatedTenantId: 'tenant-456' },
      tenantId: 'tenant-456',
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.tenantFeatureFlag.findUnique).toHaveBeenCalledWith({
      where: { tenantId_feature: { tenantId: 'tenant-456', feature: 'leads' } },
    });
  });

  it('throws when there is no tenant context', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('leads');
    const request = { user: { role: UserRole.OPERATOR } };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows when the flag exists and is enabled', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('leads');
    prisma.tenantFeatureFlag.findUnique.mockResolvedValue({ enabled: true });
    const request = {
      user: { role: UserRole.OPERATOR, tenantId: 'tenant-123' },
      tenantId: 'tenant-123',
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('rejects when the flag is missing', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('leads');
    prisma.tenantFeatureFlag.findUnique.mockResolvedValue(null);
    const request = {
      user: { role: UserRole.OPERATOR, tenantId: 'tenant-123' },
      tenantId: 'tenant-123',
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects when the flag exists but is disabled', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('leads');
    prisma.tenantFeatureFlag.findUnique.mockResolvedValue({ enabled: false });
    const request = {
      user: { role: UserRole.OPERATOR, tenantId: 'tenant-123' },
      tenantId: 'tenant-123',
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
