import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus, MessageStatus, Prisma } from '@prisma/client';

@Injectable()
export class StreamingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Events ──────────────────────────────────────────────────────────

  async findManyByTenant(tenantId: string) {
    return this.prisma.event.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        deceased: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        room: { select: { id: true, name: true, venue: { select: { name: true } } } },
        _count: { select: { messages: true, leads: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.event.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        deceased: true,
        room: { include: { venue: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.event.findUnique({
      where: { slug },
      include: {
        deceased: {
          select: {
            firstName: true,
            lastName: true,
            birthDate: true,
            deathDate: true,
            photoUrl: true,
            biography: true,
            epitaph: true,
          },
        },
        tenant: {
          select: {
            name: true,
            brandConfig: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.EventCreateInput) {
    return this.prisma.event.create({ data });
  }

  async update(tenantId: string, id: string, data: Prisma.EventUpdateInput) {
    return this.prisma.event.update({
      where: { id },
      data,
    });
  }

  async softDelete(tenantId: string, id: string) {
    return this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CANCELLED' as EventStatus },
    });
  }

  async findByRoomAndTimeOverlap(
    tenantId: string,
    roomId: string,
    scheduledAt: Date,
    estimatedDuration: number,
    excludeId?: string,
  ) {
    const endTime = new Date(scheduledAt.getTime() + estimatedDuration * 60000);
    return this.prisma.event.findFirst({
      where: {
        tenantId,
        roomId,
        deletedAt: null,
        status: { notIn: ['CANCELLED' as EventStatus, 'FINISHED' as EventStatus] },
        id: excludeId ? { not: excludeId } : undefined,
        scheduledAt: { lt: endTime },
        ...(estimatedDuration
          ? {}
          : {
              OR: [
                { scheduledAt: { gte: scheduledAt } },
                { finishedAt: { gte: scheduledAt } },
              ],
            }),
      },
    });
  }

  // ── Messages ────────────────────────────────────────────────────────

  async findMessagesByEvent(tenantId: string, eventId: string, status?: MessageStatus) {
    return this.prisma.message.findMany({
      where: {
        tenantId,
        eventId,
        deletedAt: null,
        ...(status ? { status } : { status: 'APPROVED' as MessageStatus }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findMessagesPendingModeration(tenantId: string, eventId: string) {
    return this.prisma.message.findMany({
      where: {
        tenantId,
        eventId,
        status: 'PENDING' as MessageStatus,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMessage(data: Prisma.MessageCreateInput) {
    return this.prisma.message.create({ data });
  }

  async approveMessage(eventId: string, messageId: string, approvedBy: string) {
    return this.prisma.message.update({
      where: { id: messageId, eventId },
      data: { status: 'APPROVED' as MessageStatus, approvedBy, approvedAt: new Date() },
    });
  }

  async rejectMessage(eventId: string, messageId: string, reason?: string) {
    return this.prisma.message.update({
      where: { id: messageId, eventId },
      data: { status: 'REJECTED' as MessageStatus, rejectedReason: reason ?? null },
    });
  }

  async softDeleteMessage(eventId: string, messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId, eventId },
      data: { deletedAt: new Date() },
    });
  }

  // ── Viewer count ────────────────────────────────────────────────────

  async updateViewerCount(eventId: string, count: number) {
    return this.prisma.event.update({
      where: { id: eventId },
      data: { viewerCount: count },
    });
  }

  // ── Leads ───────────────────────────────────────────────────────────

  async createLead(data: Prisma.LeadCreateInput) {
    return this.prisma.lead.create({ data });
  }

  // ── Deceased ────────────────────────────────────────────────────────

  async createDeceased(data: Prisma.DeceasedCreateInput) {
    return this.prisma.deceased.create({ data });
  }

  async findDeceasedByTenant(tenantId: string, id: string) {
    return this.prisma.deceased.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }
}
