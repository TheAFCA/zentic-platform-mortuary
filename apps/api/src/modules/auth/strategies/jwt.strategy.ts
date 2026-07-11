import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Permission, JwtPayload, UserRole } from '@zentic/shared-types';
import { PrismaService } from '../../../prisma/prisma.service';
import { SecurityEventsService } from '../../security-events/security-events.service';

const cookieExtractor = (request: { cookies?: Record<string, string> }) =>
  request.cookies?.access_token ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private readonly securityEvents: SecurityEventsService,
  ) {
    super({
      // El Bearer header va primero: las sesiones de impersonación (Módulo 04) viajan
      // como Bearer token, sin cookie, y no deben quedar tapadas por una cookie de
      // tenant que exista en el mismo navegador/pestaña.
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    request: { resolvedTenantId?: string },
    payload: JwtPayload,
  ): Promise<JwtPayload> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        lockedUntil: true,
        permissions: {
          select: { permission: true },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    if (
      (user.role as UserRole) !== UserRole.SUPER_ADMIN &&
      request.resolvedTenantId &&
      user.tenantId !== request.resolvedTenantId
    ) {
      void this.securityEvents.recordTenantContextMismatch({
        actorId: user.id,
        role: user.role as UserRole,
        tenantId: user.tenantId,
        metadata: {
          resolvedTenantId: request.resolvedTenantId,
          tokenTenantId: user.tenantId,
          source: 'jwt-strategy',
        },
      });
      throw new UnauthorizedException('Tenant context mismatch');
    }

    const permissions = user.permissions.map(
      (permission) => permission.permission as Permission,
    );

    return {
      ...payload,
      email: user.email,
      role: user.role as UserRole,
      tenantId: user.tenantId,
      permissions,
    };
  }
}
