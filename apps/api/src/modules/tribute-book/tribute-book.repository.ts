import { Injectable } from '@nestjs/common';
import {
  Deceased,
  Event,
  Message,
  MessageStatus,
  Obituary,
  ObituaryMessage,
  Prisma,
  TributeBookGeneration,
  TributeBookStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface TributeMessageFilters {
  status?: MessageStatus;
  eventId?: string;
  obituaryId?: string;
  search?: string;
  trashed?: boolean;
}

export interface CreateGenerationData {
  tenantId: string;
  eventId?: string;
  obituaryId?: string;
  generatedBy: string;
  messageCount: number;
}

export interface UpdateGenerationStatusData {
  status: TributeBookStatus;
  pdfUrl?: string;
  errorMessage?: string;
  expiresAt?: Date;
}

@Injectable()
export class TributeBookRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStreamingMessages(
    tenantId: string,
    filters: TributeMessageFilters,
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: this.buildStreamingWhere(tenantId, filters),
      orderBy: { createdAt: 'desc' },
    });
  }

  findObituaryMessages(
    tenantId: string,
    filters: TributeMessageFilters,
  ): Promise<ObituaryMessage[]> {
    return this.prisma.obituaryMessage.findMany({
      where: this.buildObituaryWhere(tenantId, filters),
      orderBy: { createdAt: 'desc' },
    });
  }

  async countPending(tenantId: string): Promise<number> {
    const [streaming, obituary] = await Promise.all([
      this.prisma.message.count({
        where: { tenantId, status: MessageStatus.PENDING, deletedAt: null },
      }),
      this.prisma.obituaryMessage.count({
        where: { tenantId, status: MessageStatus.PENDING, deletedAt: null },
      }),
    ]);
    return streaming + obituary;
  }

  findStreamingMessageById(
    tenantId: string,
    id: string,
  ): Promise<Message | null> {
    return this.prisma.message.findFirst({ where: { id, tenantId } });
  }

  findObituaryMessageById(
    tenantId: string,
    id: string,
  ): Promise<ObituaryMessage | null> {
    return this.prisma.obituaryMessage.findFirst({ where: { id, tenantId } });
  }

  async setStreamingMessageStatus(
    tenantId: string,
    id: string,
    status: MessageStatus,
    actorId: string,
    rejectedReason?: string,
  ): Promise<Message> {
    await this.prisma.message.updateMany({
      where: { id, tenantId },
      data: {
        status,
        approvedBy: actorId,
        approvedAt: new Date(),
        rejectedReason: rejectedReason ?? null,
      },
    });
    return this.prisma.message.findFirstOrThrow({ where: { id, tenantId } });
  }

  async setObituaryMessageStatus(
    tenantId: string,
    id: string,
    status: MessageStatus,
    actorId: string,
    rejectedReason?: string,
  ): Promise<ObituaryMessage> {
    await this.prisma.obituaryMessage.updateMany({
      where: { id, tenantId },
      data: {
        status,
        approvedBy: actorId,
        approvedAt: new Date(),
        rejectedReason: rejectedReason ?? null,
      },
    });
    return this.prisma.obituaryMessage.findFirstOrThrow({
      where: { id, tenantId },
    });
  }

  bulkApprove(
    tenantId: string,
    streamingIds: string[],
    obituaryIds: string[],
    actorId: string,
  ): Promise<[Prisma.BatchPayload, Prisma.BatchPayload]> {
    return Promise.all([
      this.prisma.message.updateMany({
        where: { id: { in: streamingIds }, tenantId },
        data: {
          status: MessageStatus.APPROVED,
          approvedBy: actorId,
          approvedAt: new Date(),
        },
      }),
      this.prisma.obituaryMessage.updateMany({
        where: { id: { in: obituaryIds }, tenantId },
        data: {
          status: MessageStatus.APPROVED,
          approvedBy: actorId,
          approvedAt: new Date(),
        },
      }),
    ]);
  }

  async softDeleteStreamingMessage(
    tenantId: string,
    id: string,
  ): Promise<void> {
    await this.prisma.message.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async softDeleteObituaryMessage(tenantId: string, id: string): Promise<void> {
    await this.prisma.obituaryMessage.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async restoreStreamingMessage(tenantId: string, id: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: { id, tenantId },
      data: { deletedAt: null },
    });
  }

  async restoreObituaryMessage(tenantId: string, id: string): Promise<void> {
    await this.prisma.obituaryMessage.updateMany({
      where: { id, tenantId },
      data: { deletedAt: null },
    });
  }

  findEventWithDeceased(
    tenantId: string,
    eventId: string,
  ): Promise<(Event & { deceased: Deceased }) | null> {
    return this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      include: { deceased: true },
    });
  }

  findObituaryWithDeceased(
    tenantId: string,
    obituaryId: string,
  ): Promise<(Obituary & { deceased: Deceased }) | null> {
    return this.prisma.obituary.findFirst({
      where: { id: obituaryId, tenantId, deletedAt: null },
      include: { deceased: true },
    });
  }

  findObituaryByEventId(
    tenantId: string,
    eventId: string,
  ): Promise<Obituary | null> {
    return this.prisma.obituary.findFirst({
      where: { eventId, tenantId, deletedAt: null },
    });
  }

  findApprovedStreamingMessages(eventId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { eventId, status: MessageStatus.APPROVED, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  findApprovedObituaryMessages(obituaryId: string): Promise<ObituaryMessage[]> {
    return this.prisma.obituaryMessage.findMany({
      where: { obituaryId, status: MessageStatus.APPROVED, deletedAt: null },
      orderBy: { createdAt: 'asc' },
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

  createGeneration(data: CreateGenerationData): Promise<TributeBookGeneration> {
    return this.prisma.tributeBookGeneration.create({
      data: {
        tenantId: data.tenantId,
        eventId: data.eventId,
        obituaryId: data.obituaryId,
        generatedBy: data.generatedBy,
        messageCount: data.messageCount,
        status: TributeBookStatus.PROCESSING,
      },
    });
  }

  updateGenerationStatus(
    id: string,
    data: UpdateGenerationStatusData,
  ): Promise<TributeBookGeneration> {
    return this.prisma.tributeBookGeneration.update({
      where: { id },
      data,
    });
  }

  findGenerationById(
    tenantId: string,
    id: string,
  ): Promise<TributeBookGeneration | null> {
    return this.prisma.tributeBookGeneration.findFirst({
      where: { id, tenantId },
    });
  }

  async listGenerations(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TributeBookGeneration[]; total: number }> {
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.tributeBookGeneration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tributeBookGeneration.count({ where }),
    ]);
    return { data, total };
  }

  /** Barrido global (no filtra por tenant) de mensajes en papelera hace más de `cutoff` (RN-TRIB-003). */
  async hardDeleteOlderThan(cutoff: Date): Promise<{
    streamingDeleted: number;
    obituaryDeleted: number;
  }> {
    const [streaming, obituary] = await Promise.all([
      this.prisma.message.deleteMany({
        where: { deletedAt: { lte: cutoff } },
      }),
      this.prisma.obituaryMessage.deleteMany({
        where: { deletedAt: { lte: cutoff } },
      }),
    ]);
    return {
      streamingDeleted: streaming.count,
      obituaryDeleted: obituary.count,
    };
  }

  private buildStreamingWhere(
    tenantId: string,
    filters: TributeMessageFilters,
  ): Prisma.MessageWhereInput {
    return {
      tenantId,
      deletedAt: filters.trashed ? { not: null } : null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.eventId ? { eventId: filters.eventId } : {}),
      ...(filters.search
        ? {
            OR: [
              { authorName: { contains: filters.search, mode: 'insensitive' } },
              { content: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private buildObituaryWhere(
    tenantId: string,
    filters: TributeMessageFilters,
  ): Prisma.ObituaryMessageWhereInput {
    return {
      tenantId,
      deletedAt: filters.trashed ? { not: null } : null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.obituaryId ? { obituaryId: filters.obituaryId } : {}),
      ...(filters.search
        ? {
            OR: [
              { authorName: { contains: filters.search, mode: 'insensitive' } },
              { content: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
}
