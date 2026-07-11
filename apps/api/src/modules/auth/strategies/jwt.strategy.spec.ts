import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload, UserRole } from '@zentic/shared-types';
import { SecurityEventsService } from '../../security-events/security-events.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: {
    user: { findFirst: jest.Mock };
  };
  let securityEvents: jest.Mocked<
    Pick<
      SecurityEventsService,
      | 'recordTenantContextMismatch'
      | 'recordFailedLogin'
      | 'recordAccountLocked'
      | 'recordInvalidRefreshToken'
      | 'record'
    >
  >;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
      },
    };

    securityEvents = {
      recordTenantContextMismatch: jest.fn(),
      recordFailedLogin: jest.fn(),
      recordAccountLocked: jest.fn(),
      recordInvalidRefreshToken: jest.fn(),
      record: jest.fn(),
    };

    const config = {
      getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(
      config,
      prisma as unknown as PrismaService,
      securityEvents as unknown as SecurityEventsService,
    );
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

  it('passes impersonation claims through untouched (Módulo 04 — Super Admin)', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'super-1',
      email: 'super@zentic.pro',
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      lockedUntil: null,
      permissions: [],
    });

    const payload = {
      sub: 'super-1',
      email: 'super@zentic.pro',
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      permissions: [],
      impersonatedTenantId: 'tenant-1',
      impersonationLogId: 'log-1',
    } as JwtPayload;

    await expect(strategy.validate({}, payload)).resolves.toEqual(payload);
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
