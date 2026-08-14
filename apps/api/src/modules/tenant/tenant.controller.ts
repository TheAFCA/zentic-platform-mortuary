import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('tenant')
export class TenantController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Marca del tenant para la pantalla de login, previa a cualquier autenticación.
   * Devuelve null si no hay tenant resuelto (ej. host reservado del super admin).
   */
  @Public()
  @Get('branding')
  async getBranding(@TenantId() tenantId: string) {
    if (!tenantId) return null;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        brandConfig: {
          select: { logoUrl: true, primaryColor: true, secondaryColor: true },
        },
      },
    });
    if (!tenant) return null;

    return {
      name: tenant.name,
      logoUrl: tenant.brandConfig?.logoUrl ?? null,
      primaryColor: tenant.brandConfig?.primaryColor ?? '#0F5E59',
      secondaryColor: tenant.brandConfig?.secondaryColor ?? '#6B9080',
    };
  }
}
