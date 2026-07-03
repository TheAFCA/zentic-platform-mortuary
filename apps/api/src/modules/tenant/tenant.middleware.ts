import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const host = req.hostname;
    const platformDomain = process.env.PLATFORM_DOMAIN ?? 'localhost';

    // Extract subdomain: {slug}.plataforma.com
    const slug = host.replace(`.${platformDomain}`, '');
    if (!slug || slug === host) {
      return next(); // no subdomain (platform admin routes, health checks)
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!tenant) throw new NotFoundException(`Tenant '${slug}' not found`);

    (req as Request & { resolvedTenantId: string }).resolvedTenantId = tenant.id;
    next();
  }
}
