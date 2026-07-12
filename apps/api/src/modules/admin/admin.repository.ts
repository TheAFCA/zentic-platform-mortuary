import { Injectable } from '@nestjs/common';
import { EventStatus, MessageStatus, ObituaryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DateRange } from '../../common/utils/date-range.util';

export interface AdminUserRecord {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  lockedUntil: Date | null;
}

const ACTIVE_EVENT_STATUSES: EventStatus[] = [
  EventStatus.SCHEDULED,
  EventStatus.LIVE,
  EventStatus.PAUSED,
];

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  countActiveEventsToday(tenantId: string, range: DateRange): Promise<number> {
    return this.prisma.event.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ACTIVE_EVENT_STATUSES },
        scheduledAt: { gte: range.start, lt: range.end },
      },
    });
  }

  countObituariesPublished(
    tenantId: string,
    range: DateRange,
  ): Promise<number> {
    return this.prisma.obituary.count({
      where: {
        tenantId,
        deletedAt: null,
        status: ObituaryStatus.PUBLISHED,
        publishedAt: { gte: range.start, lt: range.end },
      },
    });
  }

  countPendingMessages(tenantId: string): Promise<number> {
    return this.prisma.message.count({
      where: { tenantId, deletedAt: null, status: MessageStatus.PENDING },
    });
  }

  countLeadsInRange(tenantId: string, range: DateRange): Promise<number> {
    return this.prisma.lead.count({
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: range.start, lt: range.end },
      },
    });
  }

  async sumLiveViewers(tenantId: string): Promise<number> {
    const result = await this.prisma.event.aggregate({
      where: { tenantId, deletedAt: null, status: EventStatus.LIVE },
      _sum: { viewerCount: true },
    });
    return result._sum.viewerCount ?? 0;
  }

  countActiveClients(tenantId: string): Promise<number> {
    return this.prisma.client.count({ where: { tenantId, deletedAt: null } });
  }

  findAccountSettings(tenantId: string) {
    return this.prisma.tenantAccountSettings.findUnique({
      where: { tenantId },
    });
  }

  upsertAccountSettings(
    tenantId: string,
    data: Partial<{
      timezone: string;
      locale: string;
      notifyNewLead: boolean;
      notifyPendingMessages: boolean;
      notifyWeeklySummary: boolean;
      requireAccessCodeDefault: boolean;
    }>,
  ) {
    return this.prisma.tenantAccountSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
  }

  findBrandConfig(tenantId: string) {
    return this.prisma.tenantBrandConfig.findUnique({ where: { tenantId } });
  }

  upsertBrandConfig(
    tenantId: string,
    data: Partial<{
      logoUrl: string | null;
      faviconUrl: string | null;
      primaryColor: string;
      secondaryColor: string;
      textColor: string;
      backgroundColor: string;
    }>,
  ) {
    return this.prisma.tenantBrandConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
  }

  findManyUsers(tenantId: string): Promise<AdminUserRecord[]> {
    return this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lockedUntil: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findUserById(tenantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lockedUntil: true,
      },
    });
  }

  findUserByEmail(tenantId: string, email: string) {
    return this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
  }

  createUser(
    tenantId: string,
    data: { email: string; passwordHash: string; role: 'OPERATOR' | 'VIEWER' },
  ): Promise<AdminUserRecord> {
    return this.prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lockedUntil: true,
      },
    });
  }

  async updateUserRole(
    tenantId: string,
    id: string,
    role: 'OPERATOR' | 'VIEWER',
  ): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id, tenantId },
      data: { role },
    });
  }
}
