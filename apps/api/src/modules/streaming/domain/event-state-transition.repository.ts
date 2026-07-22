import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventStateTransition, EventStatus, Prisma } from '@prisma/client';

@Injectable()
export class EventStateTransitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.EventStateTransitionCreateInput,
  ): Promise<EventStateTransition> {
    return this.prisma.eventStateTransition.create({ data });
  }

  async findByEventId(
    tenantId: string,
    eventId: string,
  ): Promise<EventStateTransition[]> {
    return this.prisma.eventStateTransition.findMany({
      where: { tenantId, eventId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findLatestByEventId(
    tenantId: string,
    eventId: string,
  ): Promise<EventStateTransition | null> {
    return this.prisma.eventStateTransition.findFirst({
      where: { tenantId, eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByTenantAndStatus(
    tenantId: string,
    fromStatus: EventStatus,
    toStatus: EventStatus,
    since: Date,
  ): Promise<number> {
    return this.prisma.eventStateTransition.count({
      where: {
        tenantId,
        fromStatus,
        toStatus,
        createdAt: { gte: since },
      },
    });
  }
}
