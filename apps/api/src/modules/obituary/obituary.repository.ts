import { Injectable } from '@nestjs/common';
import {
  Deceased,
  Event,
  MessageStatus,
  Obituary,
  ObituaryMessage,
  ObituaryStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ObituaryWithDeceased = Obituary & { deceased: Deceased };

export interface ObituaryListFilters {
  status?: ObituaryStatus;
  search?: string;
  page: number;
  limit: number;
}

export interface CreateDeceasedData {
  firstName: string;
  lastName: string;
  birthDate?: Date;
  deathDate?: Date;
  birthCity?: string;
  deathCity?: string;
  biography?: string;
  epitaph?: string;
}

export type UpdateDeceasedData = Partial<CreateDeceasedData>;

export interface ObituaryFieldsData {
  eventId?: string;
  isPublic?: boolean;
  accessCode?: string;
}

export interface EventSummary {
  id: string;
  slug: string;
  scheduledAt: Date;
  status: string;
}

export interface CreateObituaryMessageData {
  authorName: string;
  content: string;
  iconType?: string;
}

@Injectable()
export class ObituaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    tenantId: string,
    filters: ObituaryListFilters,
  ): Promise<{ data: ObituaryWithDeceased[]; total: number }> {
    const where = this.buildWhere(tenantId, filters);
    const [data, total] = await Promise.all([
      this.prisma.obituary.findMany({
        where,
        include: { deceased: true },
        orderBy: { deceased: { deathDate: 'desc' } },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.obituary.count({ where }),
    ]);
    return { data, total };
  }

  findById(tenantId: string, id: string): Promise<ObituaryWithDeceased | null> {
    return this.prisma.obituary.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { deceased: true },
    });
  }

  findBySlugPublic(
    tenantId: string,
    slug: string,
  ): Promise<ObituaryWithDeceased | null> {
    return this.prisma.obituary.findFirst({
      where: {
        slug,
        tenantId,
        status: ObituaryStatus.PUBLISHED,
        deletedAt: null,
      },
      include: { deceased: true },
    });
  }

  async createWithDeceased(
    tenantId: string,
    slug: string,
    deceased: CreateDeceasedData,
    obituary: ObituaryFieldsData,
  ): Promise<ObituaryWithDeceased> {
    return this.prisma.$transaction(async (tx) => {
      const createdDeceased = await tx.deceased.create({
        data: { tenantId, ...deceased },
      });
      const createdObituary = await tx.obituary.create({
        data: {
          tenantId,
          deceasedId: createdDeceased.id,
          slug,
          eventId: obituary.eventId,
          isPublic: obituary.isPublic ?? true,
          accessCode: obituary.accessCode,
        },
      });
      return { ...createdObituary, deceased: createdDeceased };
    });
  }

  async update(
    tenantId: string,
    id: string,
    deceasedId: string,
    deceased: UpdateDeceasedData,
    obituary: Partial<ObituaryFieldsData>,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.deceased.updateMany({
        where: { id: deceasedId, tenantId },
        data: deceased,
      }),
      this.prisma.obituary.updateMany({
        where: { id, tenantId, deletedAt: null },
        data: obituary,
      }),
    ]);
  }

  async updatePhoto(
    tenantId: string,
    deceasedId: string,
    photoUrl: string,
  ): Promise<void> {
    await this.prisma.deceased.updateMany({
      where: { id: deceasedId, tenantId },
      data: { photoUrl },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: ObituaryStatus,
    publishedAt: Date | null,
  ): Promise<void> {
    await this.prisma.obituary.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { status, publishedAt },
    });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.obituaryMessage.updateMany({
        where: { obituaryId: id, tenantId, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.obituary.updateMany({
        where: { id, tenantId, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);
  }

  findEventById(tenantId: string, eventId: string): Promise<Event | null> {
    return this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
  }

  listEventsForTenant(tenantId: string): Promise<EventSummary[]> {
    return this.prisma.event.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { scheduledAt: 'desc' },
      select: { id: true, slug: true, scheduledAt: true, status: true },
    });
  }

  async findTenantBrand(
    tenantId: string,
  ): Promise<{ name: string; logoUrl: string | null } | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, brandConfig: { select: { logoUrl: true } } },
    });
    if (!tenant) return null;
    return { name: tenant.name, logoUrl: tenant.brandConfig?.logoUrl ?? null };
  }

  findApprovedMessages(
    tenantId: string,
    obituaryId: string,
  ): Promise<ObituaryMessage[]> {
    return this.prisma.obituaryMessage.findMany({
      where: {
        obituaryId,
        tenantId,
        status: MessageStatus.APPROVED,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  createMessage(
    tenantId: string,
    obituaryId: string,
    data: CreateObituaryMessageData,
  ): Promise<ObituaryMessage> {
    return this.prisma.obituaryMessage.create({
      data: { tenantId, obituaryId, ...data },
    });
  }

  private buildWhere(
    tenantId: string,
    filters: Partial<Pick<ObituaryListFilters, 'status' | 'search'>>,
  ): Prisma.ObituaryWhereInput {
    return {
      tenantId,
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            deceased: {
              OR: [
                {
                  firstName: { contains: filters.search, mode: 'insensitive' },
                },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
  }
}
