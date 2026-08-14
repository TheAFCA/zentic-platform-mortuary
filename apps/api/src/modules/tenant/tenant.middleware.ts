import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

const RESERVED_HOST_SLUGS = new Set([
  'localhost',
  'admin',
  'super-admin',
  'www',
]);

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_CHARS_PATTERN = /^[0-9a-fA-F:]+$/;

/** req.hostname para IPv6 no trae corchetes, por eso se detecta por ':' + solo hex. */
const isIpAddress = (host: string): boolean =>
  IPV4_PATTERN.test(host) || (host.includes(':') && IPV6_CHARS_PATTERN.test(host));

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const platformDomain = process.env.PLATFORM_DOMAIN ?? 'localhost';

    const headerValue = req.headers?.['x-tenant-slug'];
    const headerTenantSlug = Array.isArray(headerValue)
      ? headerValue[0]?.trim()
      : headerValue?.trim();
    if (headerTenantSlug && !RESERVED_HOST_SLUGS.has(headerTenantSlug)) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { slug: headerTenantSlug, deletedAt: null },
        select: { id: true, status: true },
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant '${headerTenantSlug}' not found`);
      }

      (req as Request & { resolvedTenantId: string }).resolvedTenantId =
        tenant.id;
      return next();
    }

    const host = req.hostname;

    // Acceso por IP directa (ej. pruebas sin dominio todavía) — nunca es un subdominio de tenant,
    // y el reemplazo de abajo no la detectaría de forma confiable si PLATFORM_DOMAIN no coincide.
    if (isIpAddress(host)) {
      return next();
    }

    // Extract subdomain: {slug}.plataforma.com
    const slug = host.replace(`.${platformDomain}`, '');
    if (!slug || slug === host || RESERVED_HOST_SLUGS.has(slug)) {
      return next(); // no subdomain (platform admin routes, health checks)
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!tenant) throw new NotFoundException(`Tenant '${slug}' not found`);

    (req as Request & { resolvedTenantId: string }).resolvedTenantId =
      tenant.id;
    next();
  }
}
