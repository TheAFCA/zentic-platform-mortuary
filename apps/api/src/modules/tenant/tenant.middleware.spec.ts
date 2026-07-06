import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantMiddleware } from './tenant.middleware';

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

    await middleware.use({ hostname: 'localhost' } as any, {} as any, next);

    expect(prisma.tenant.findFirst).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('resolves tenant from subdomain', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      status: 'ACTIVE',
    });
    const next = jest.fn();
    const request: any = { hostname: 'demo.localhost' };

    await middleware.use(request, {} as any, next);

    expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
      where: { slug: 'demo', deletedAt: null },
      select: { id: true, status: true },
    });
    expect(request.resolvedTenantId).toBe('tenant-1');
    expect(next).toHaveBeenCalled();
  });

  it('throws when tenant does not exist', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);

    await expect(
      middleware.use(
        { hostname: 'missing.localhost' } as any,
        {} as any,
        jest.fn(),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
