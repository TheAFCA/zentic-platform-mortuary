import { Injectable } from '@nestjs/common';
import {
  Deceased,
  Event,
  Invitation,
  InvitationStatus,
  InvitationTemplate,
  Prisma,
  Room,
  TenantBrandConfig,
  Venue,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type EventForInvitation = Event & {
  deceased: Deceased;
  room: (Room & { venue: Venue }) | null;
  tenant: { name: string; brandConfig: TenantBrandConfig | null };
};

export interface InvitationListFilters {
  status?: InvitationStatus;
  eventId?: string;
  page: number;
  limit: number;
}

export interface CreateInvitationData {
  eventId: string;
  template?: InvitationTemplate;
  message?: string;
  accessCodeDisplay?: string;
}

export type UpdateInvitationData = Partial<
  Omit<CreateInvitationData, 'eventId'>
>;

const EVENT_INCLUDE = {
  deceased: true,
  room: { include: { venue: true } },
  tenant: { select: { name: true, brandConfig: true } },
} satisfies Prisma.EventInclude;

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    tenantId: string,
    filters: InvitationListFilters,
  ): Promise<{ data: Invitation[]; total: number }> {
    const where: Prisma.InvitationWhereInput = {
      tenantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.eventId ? { eventId: filters.eventId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.invitation.count({ where }),
    ]);
    return { data, total };
  }

  findById(tenantId: string, id: string): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({ where: { id, tenantId } });
  }

  /** RN-INV-003: resuelve invitaciones PUBLISHED o ARCHIVED — el enlace sigue activo. */
  findByPublicUrl(
    tenantId: string,
    publicUrl: string,
  ): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: {
        publicUrl,
        tenantId,
        status: { in: [InvitationStatus.PUBLISHED, InvitationStatus.ARCHIVED] },
      },
    });
  }

  create(
    tenantId: string,
    createdBy: string,
    data: CreateInvitationData,
  ): Promise<Invitation> {
    return this.prisma.invitation.create({
      data: {
        tenantId,
        createdBy,
        eventId: data.eventId,
        template: data.template,
        message: data.message,
        accessCodeDisplay: data.accessCodeDisplay,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: UpdateInvitationData,
  ): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: InvitationStatus,
    publishedAt: Date | null,
    publicUrl?: string,
  ): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: { id, tenantId },
      data: { status, publishedAt, ...(publicUrl ? { publicUrl } : {}) },
    });
  }

  async updateImageUrl(
    tenantId: string,
    id: string,
    imageUrl: string,
  ): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: { id, tenantId },
      data: { imageUrl },
    });
  }

  /** RN-INV-002: al eliminar/cancelar un evento, sus invitaciones se archivan (no se borran). */
  async archiveByEventId(tenantId: string, eventId: string): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: { eventId, tenantId, status: { not: InvitationStatus.ARCHIVED } },
      data: { status: InvitationStatus.ARCHIVED },
    });
  }

  /**
   * Lectura estricta usada en create/publish: el evento debe existir y no estar cancelado/
   * eliminado, ya que esas operaciones requieren un evento activo.
   */
  findEventForInvitation(
    tenantId: string,
    eventId: string,
  ): Promise<EventForInvitation | null> {
    return this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      include: EVENT_INCLUDE,
    });
  }

  /**
   * Lectura inclusiva (sin filtrar deletedAt) usada en findPublic/generateImage: el enlace de
   * una invitación debe seguir resolviendo aunque el evento haya sido cancelado (RN-INV-003),
   * incluyendo el banner de "evento cancelado" del caso borde §13.
   */
  findEventForInvitationRender(
    tenantId: string,
    eventId: string,
  ): Promise<EventForInvitation | null> {
    return this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      include: EVENT_INCLUDE,
    });
  }
}
