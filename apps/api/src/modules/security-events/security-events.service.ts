import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SecurityEventAlert,
  SecurityEventType,
  UserRole,
} from '@zentic/shared-types';
import { SecurityEventsGateway } from './security-events.gateway';

type SecurityEventInput = {
  actorId: string;
  role: UserRole;
  tenantId?: string | null;
  entityType?: string;
  entityId?: string;
  ipAddress?: string | null;
  metadata?: Prisma.InputJsonValue;
  message: string;
};

@Injectable()
export class SecurityEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: SecurityEventsGateway,
  ) {}

  async record(eventType: SecurityEventType, input: SecurityEventInput) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        role: input.role,
        action: eventType,
        entityType: input.entityType ?? 'security',
        entityId: input.entityId ?? null,
        metadata: {
          ...this.toMetadataObject(input.metadata),
          message: input.message,
        },
        ipAddress: input.ipAddress ?? null,
        tenantId: input.tenantId ?? null,
      },
    });

    const alert: SecurityEventAlert = {
      id: auditLog.id,
      type: eventType,
      actorId: input.actorId,
      role: input.role,
      tenantId: input.tenantId ?? null,
      message: input.message,
      metadata: this.toMetadataObject(input.metadata),
      createdAt: auditLog.createdAt.toISOString(),
    };

    this.gateway.broadcastSecurityAlert(alert);
    return alert;
  }

  async recordFailedLogin(input: Omit<SecurityEventInput, 'message'>) {
    const attempts = this.readNumber(input.metadata, 'attempts');
    const message = attempts
      ? `Failed login attempt ${attempts}`
      : 'Failed login attempt';

    return this.record(SecurityEventType.FAILED_LOGIN, {
      ...input,
      message,
    });
  }

  async recordAccountLocked(input: Omit<SecurityEventInput, 'message'>) {
    return this.record(SecurityEventType.ACCOUNT_LOCKED, {
      ...input,
      message: 'Account temporarily locked',
    });
  }

  async recordTenantContextMismatch(
    input: Omit<SecurityEventInput, 'message'>,
  ) {
    return this.record(SecurityEventType.TENANT_CONTEXT_MISMATCH, {
      ...input,
      message: 'Tenant context mismatch detected',
    });
  }

  async recordInvalidRefreshToken(input: Omit<SecurityEventInput, 'message'>) {
    return this.record(SecurityEventType.INVALID_REFRESH_TOKEN, {
      ...input,
      message: 'Invalid refresh token detected',
    });
  }

  private toMetadataObject(metadata?: Prisma.InputJsonValue) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }

    return metadata as Record<string, unknown>;
  }

  private readNumber(metadata: Prisma.InputJsonValue | undefined, key: string) {
    const value = this.toMetadataObject(metadata)[key];
    return typeof value === 'number' ? value : null;
  }
}
