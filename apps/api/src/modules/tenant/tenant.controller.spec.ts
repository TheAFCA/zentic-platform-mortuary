import { PrismaService } from '../../prisma/prisma.service';
import { TenantController } from './tenant.controller';

describe('TenantController', () => {
  let controller: TenantController;
  let prisma: { tenant: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn(),
      },
    };
    controller = new TenantController(prisma as unknown as PrismaService);
  });

  it('returns null when no tenant was resolved (host reservado)', async () => {
    const result = await controller.getBranding('');

    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null when the resolved tenant no longer exists', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);

    const result = await controller.getBranding('tenant-1');

    expect(result).toBeNull();
  });

  it('returns the tenant name and brand colors', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      name: 'Funeraria Demo',
      brandConfig: {
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#123456',
        secondaryColor: '#abcdef',
      },
    });

    const result = await controller.getBranding('tenant-1');

    expect(result).toEqual({
      name: 'Funeraria Demo',
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#123456',
      secondaryColor: '#abcdef',
    });
  });

  it('falls back to default colors when the tenant has no brandConfig row', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      name: 'Funeraria Demo',
      brandConfig: null,
    });

    const result = await controller.getBranding('tenant-1');

    expect(result).toEqual({
      name: 'Funeraria Demo',
      logoUrl: null,
      primaryColor: '#0F5E59',
      secondaryColor: '#6B9080',
    });
  });
});
