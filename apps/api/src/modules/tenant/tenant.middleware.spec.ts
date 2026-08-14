import { NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantMiddleware } from './tenant.middleware';

type TenantRequest = Request & { resolvedTenantId?: string };

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let prisma: { tenant: { findFirst: jest.Mock } };

  beforeEach(() => {
    prisma = {
      tenant: {
        findFirst: jest.fn(),
      },
    };

    middleware = new TenantMiddleware(prisma as unknown as PrismaService);
    process.env.PLATFORM_DOMAIN = 'localhost';
  });

  afterEach(() => {
    delete process.env.PLATFORM_DOMAIN;
  });

  it('skips platform routes without subdomain', async () => {
    const next = jest.fn();
    const request = { hostname: 'localhost', headers: {} } as TenantRequest;
    const response = {} as Response;

    await middleware.use(request, response, next);

    expect(prisma.tenant.findFirst).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('resolves tenant from subdomain', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      status: 'ACTIVE',
    });
    const next = jest.fn();
    const request = {
      hostname: 'demo.localhost',
      headers: {},
    } as TenantRequest;
    const response = {} as Response;

    await middleware.use(request, response, next);

    expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
      where: { slug: 'demo', deletedAt: null },
      select: { id: true, status: true },
    });
    expect(request.resolvedTenantId).toBe('tenant-1');
    expect(next).toHaveBeenCalled();
  });

  it('throws when tenant does not exist', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);
    const request = {
      hostname: 'missing.localhost',
      headers: {},
    } as TenantRequest;
    const response = {} as Response;

    await expect(middleware.use(request, response, jest.fn())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('skips tenant resolution when accessed by raw IPv4 (no subdomain possible)', async () => {
    const next = jest.fn();
    const request = {
      hostname: '169.58.175.212',
      headers: {},
    } as TenantRequest;
    const response = {} as Response;

    await middleware.use(request, response, next);

    expect(prisma.tenant.findFirst).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('skips tenant resolution when accessed by raw IPv6', async () => {
    const next = jest.fn();
    const request = { hostname: '::1', headers: {} } as TenantRequest;
    const response = {} as Response;

    await middleware.use(request, response, next);

    expect(prisma.tenant.findFirst).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
