import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload, UserRole } from '@zentic/shared-types';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: {
    user: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
      },
    };

    const config = {
      getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(config, prisma as unknown as PrismaService);
  });

  it('returns a hydrated payload for an active user', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      lockedUntil: null,
      permissions: [{ permission: 'users:manage' }],
    });

    const payload = {
      sub: 'user-1',
      email: 'user@example.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      permissions: ['users:manage'],
    } as JwtPayload;

    await expect(
      strategy.validate({ resolvedTenantId: 'tenant-1' }, payload),
    ).resolves.toEqual(payload);
  });

  it('rejects missing users', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({ resolvedTenantId: 'tenant-1' }, {
        sub: 'user-1',
        email: 'user@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-1',
        permissions: [],
      } as JwtPayload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects locked users', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      lockedUntil: new Date(Date.now() + 1000),
      permissions: [],
    });

    await expect(
      strategy.validate({ resolvedTenantId: 'tenant-1' }, {
        sub: 'user-1',
        email: 'user@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-1',
        permissions: [],
      } as JwtPayload),
    ).rejects.toThrow('Account is temporarily locked');
  });

  it('rejects tenant mismatches', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-1',
      lockedUntil: null,
      permissions: [],
    });

    await expect(
      strategy.validate({ resolvedTenantId: 'tenant-2' }, {
        sub: 'user-1',
        email: 'user@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-1',
        permissions: [],
      } as JwtPayload),
    ).rejects.toThrow('Tenant context mismatch');
  });
});
