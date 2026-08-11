import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus, MessageStatus, Prisma, UserRole } from '@prisma/client';

/**
 * Repositorio del módulo de Streaming.
 *
 * Encapsula todas las operaciones de base de datos relacionadas con eventos,
 * mensajes, reacciones y difuntos. Cada método recibe explícitamente el
 * tenantId para garantizar el aislamiento multi-tenant a nivel de datos.
 *
 * @remarks
 * Todos los métodos de listado filtran por `deletedAt: null` para implementar
 * soft-delete. Las operaciones de escritura validan la pertenencia al tenant
 * mediante cláusulas `where` compuestas.
 */
@Injectable()
export class StreamingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Events ──────────────────────────────────────────────────────────

  /**
   * Obtiene todos los eventos activos de un tenant, ordenados por fecha descendente.
   * Incluye datos del difunto, sala, venue y conteo de mensajes/leads.
   *
   * @param tenantId - Identificador único del tenant
   * @returns Lista de eventos con relaciones incluidas
   */
  async findManyByTenant(tenantId: string) {
    return this.prisma.event.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        deceased: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true },
        },
        room: {
          select: {
            id: true,
            name: true,
            venue: { select: { id: true, name: true } },
          },
        },
        client: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, email: true } },
        _count: { select: { messages: true, leads: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  /**
   * Busca un evento por ID dentro de un tenant específico.
   *
   * @param tenantId - Identificador del tenant
   * @param id - Identificador único del evento
   * @returns Evento con relaciones (deceased, room, venue) o null si no existe
   */
  async findById(tenantId: string, id: string) {
    return this.prisma.event.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        deceased: true,
        room: { include: { venue: true } },
        client: { select: { id: true, name: true, phone: true, email: true } },
        assignedTo: { select: { id: true, email: true } },
      },
    });
  }

  /**
   * Busca un evento por el id que le asignó el proveedor de streaming
   * (Mux/Cloudflare). Usado por los webhooks para localizar el evento sin
   * conocer el tenant de antemano.
   *
   * @param providerStreamId - Identificador del live stream en el proveedor
   * @returns Evento con el plan del tenant, o null si no existe
   */
  async findByProviderStreamId(providerStreamId: string) {
    return this.prisma.event.findUnique({
      where: { providerStreamId },
      include: { tenant: { select: { plan: true } } },
    });
  }

  /**
   * Busca un evento por su slug público (URL amigable).
   * Incluye datos del difunto y configuración de marca del tenant.
   * Usado por la página pública del evento (sin autenticación).
   *
   * @param slug - Slug único del evento
   * @returns Evento con relaciones públicas o null si no existe
   */
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

  /**
   * Crea un nuevo evento de streaming en la base de datos.
   *
   * @param data - Datos completos del evento (Prisma create input)
   * @returns El evento creado con todos sus campos
   */
  async create(
    data: Prisma.EventCreateInput,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return db.event.create({ data });
  }

  /**
   * Actualiza un evento existente validando que pertenezca al tenant.
   *
   * @param tenantId - Identificador del tenant (validación de seguridad)
   * @param id - Identificador del evento a actualizar
   * @param data - Campos a actualizar
   * @returns El evento actualizado
   */
  async update(
    tenantId: string,
    id: string,
    data: Prisma.EventUpdateInput,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return db.event.update({
      where: { id, tenantId },
      data,
    });
  }

  async createCredentialAudit(input: {
    actorId: string;
    role: UserRole;
    tenantId: string;
    eventId: string;
    action: 'STREAM_KEY_REVEALED' | 'STREAM_KEY_COPIED' | 'STREAM_KEY_ROTATED';
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        role: input.role,
        tenantId: input.tenantId,
        action: input.action,
        entityType: 'Event',
        entityId: input.eventId,
        ipAddress: input.ipAddress,
      },
    });
  }

  /**
   * Realiza un soft-delete del evento (marca deletedAt y cambia estado a CANCELLED).
   *
   * @param tenantId - Identificador del tenant
   * @param id - Identificador del evento a cancelar
   * @returns El evento marcado como eliminado
   */
  async softDelete(tenantId: string, id: string) {
    return this.prisma.event.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
  }

  /**
   * Verifica si existe un conflicto de horario en una sala específica.
   * Usado para RN-STREAM-001: evitar eventos simultáneos en la misma sala.
   *
   * @param tenantId - Identificador del tenant
   * @param roomId - Identificador de la sala
   * @param scheduledAt - Fecha/hora del nuevo evento
   * @param estimatedDuration - Duración estimada en minutos
   * @param excludeId - ID de evento a excluir (útil en actualizaciones)
   * @returns Evento conflictivo o null si la sala está disponible
   */
  async findByRoomAndTimeOverlap(
    tenantId: string,
    roomId: string,
    scheduledAt: Date,
    estimatedDuration: number,
    excludeId?: string,
  ) {
    const newEnd = new Date(scheduledAt.getTime() + estimatedDuration * 60000);
    return this.prisma.event.findFirst({
      where: {
        tenantId,
        roomId,
        deletedAt: null,
        status: {
          notIn: ['CANCELLED', 'FINISHED'],
        },
        id: excludeId ? { not: excludeId } : undefined,
        AND: [
          { scheduledAt: { lt: newEnd } },
          {
            estimatedDuration: {
              not: null,
            },
          },
        ],
      },
    });
  }

  async findOverlappingByRoomAndTimeRange(
    tenantId: string,
    roomId: string,
    newStart: Date,
    newEnd: Date,
    excludeId?: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    // Prisma no puede expresar el fin calculado de cada fila. Limitamos por
    // inicio y comprobamos en memoria la segunda mitad de la intersección.
    const candidates = await db.event.findMany({
      where: {
        tenantId,
        roomId,
        deletedAt: null,
        status: {
          notIn: ['CANCELLED', 'FINISHED'],
        },
        id: excludeId ? { not: excludeId } : undefined,
        scheduledAt: { lt: newEnd },
      },
    });
    return (
      candidates.find((event) => {
        const duration = event.estimatedDuration ?? 60;
        const existingEnd = new Date(
          event.scheduledAt.getTime() + duration * 60_000,
        );
        return existingEnd > newStart;
      }) ?? null
    );
  }

  // ── Messages ────────────────────────────────────────────────────────

  /**
   * Obtiene los mensajes aprobados de un evento (o filtrados por estado).
   *
   * @param tenantId - Identificador del tenant
   * @param eventId - Identificador del evento
   * @param status - Estado opcional para filtrar mensajes
   * @returns Lista de mensajes ordenados por fecha ascendente
   */
  async findMessagesByEvent(
    tenantId: string,
    eventId: string,
    status?: MessageStatus,
  ) {
    return this.prisma.message.findMany({
      where: {
        tenantId,
        eventId,
        deletedAt: null,
        ...(status ? { status } : { status: 'APPROVED' }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Obtiene los mensajes pendientes de moderación para un evento.
   * Usado por el panel de moderación del operador.
   *
   * @param tenantId - Identificador del tenant
   * @param eventId - Identificador del evento
   * @returns Lista de mensajes en estado PENDING
   */
  async findMessagesPendingModeration(tenantId: string, eventId: string) {
    return this.prisma.message.findMany({
      where: {
        tenantId,
        eventId,
        status: 'PENDING',
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Crea un nuevo mensaje de homenaje en un evento.
   *
   * @param data - Datos del mensaje (autor, contenido, icono, estado, relaciones)
   * @returns El mensaje creado
   */
  async createMessage(data: Prisma.MessageCreateInput) {
    return this.prisma.message.create({ data });
  }

  /**
   * Aprueba un mensaje pendiente, registrando quién lo aprobó y la fecha.
   *
   * @param eventId - Identificador del evento
   * @param messageId - Identificador del mensaje a aprobar
   * @param approvedBy - Identificador del operador que aprueba
   * @returns El mensaje actualizado a estado APPROVED
   */
  async approveMessage(
    tenantId: string,
    eventId: string,
    messageId: string,
    approvedBy: string,
  ) {
    return this.prisma.message.update({
      where: { id: messageId, eventId, tenantId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Rechaza un mensaje, opcionalmente con una razón del rechazo.
   *
   * @param tenantId - Identificador del tenant
   * @param eventId - Identificador del evento
   * @param messageId - Identificador del mensaje a rechazar
   * @param reason - Razón opcional del rechazo (visible para el autor)
   * @returns El mensaje actualizado a estado REJECTED
   */
  async rejectMessage(
    tenantId: string,
    eventId: string,
    messageId: string,
    reason?: string,
  ) {
    return this.prisma.message.update({
      where: { id: messageId, eventId, tenantId },
      data: {
        status: 'REJECTED',
        rejectedReason: reason ?? null,
      },
    });
  }

  /**
   * Soft-delete de un mensaje (lo oculta de la vista pública).
   * El administrador puede restaurarlo hasta 7 días después (RN-STREAM-006).
   *
   * @param tenantId - Identificador del tenant
   * @param eventId - Identificador del evento
   * @param messageId - Identificador del mensaje a eliminar
   * @returns El mensaje marcado como eliminado
   */
  async softDeleteMessage(
    tenantId: string,
    eventId: string,
    messageId: string,
  ) {
    return this.prisma.message.update({
      where: { id: messageId, eventId, tenantId },
      data: { deletedAt: new Date() },
    });
  }

  // ── Viewer count ────────────────────────────────────────────────────

  /**
   * Actualiza el contador de espectadores en vivo de un evento.
   *
   * @param eventId - Identificador del evento
   * @param count - Número actual de espectadores
   * @returns El evento actualizado
   */
  async updateViewerCount(tenantId: string, eventId: string, count: number) {
    return this.prisma.event.update({
      where: { id: eventId, tenantId },
      data: { viewerCount: count },
    });
  }

  // ── Leads ───────────────────────────────────────────────────────────

  /**
   * Crea un nuevo lead asociado a un evento.
   * Usado cuando un viewer proporciona sus datos al acceder al evento.
   *
   * @param data - Datos del lead (nombre, email, consentimiento, fuente)
   * @returns El lead creado
   */
  async createLead(data: Prisma.LeadCreateInput) {
    return this.prisma.lead.create({ data });
  }

  /**
   * Obtiene los leads de un evento que dejaron su email, para notificarles
   * cuando la transmisión inicia (RF-STREAM-011).
   *
   * @param eventId - Identificador del evento
   * @returns Leads con email no nulo
   */
  async findLeadsWithEmailByEvent(tenantId: string, eventId: string) {
    return this.prisma.lead.findMany({
      where: { tenantId, eventId, email: { not: null }, deletedAt: null },
      select: { email: true, name: true, consent: true },
    });
  }

  // ── Tenant-scoped entity lookups ────────────────────────────────────

  async findRoomByTenant(tenantId: string, roomId: string) {
    return this.prisma.room.findFirst({
      where: { id: roomId, tenantId, deletedAt: null },
    });
  }

  async findClientByTenant(tenantId: string, clientId: string) {
    return this.prisma.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
    });
  }

  async findUserByTenant(tenantId: string, userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
  }

  /**
   * Busca un obituario del tenant, usado al crear un evento de streaming
   * "desde" un obituario (reutiliza su difunto y se autovincula al terminar).
   */
  async findObituaryByTenant(tenantId: string, obituaryId: string) {
    return this.prisma.obituary.findFirst({
      where: { id: obituaryId, tenantId, deletedAt: null },
    });
  }

  /**
   * Autovincula el obituario de origen al evento recién creado
   * (Obituary.eventId), dentro de la misma transacción de creación del evento.
   */
  async linkObituary(
    tenantId: string,
    obituaryId: string,
    eventId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    await db.obituary.updateMany({
      where: { id: obituaryId, tenantId },
      data: { eventId },
    });
  }

  // ── Deceased ────────────────────────────────────────────────────────

  /**
   * Crea un nuevo registro de difunto en el sistema.
   *
   * @param data - Datos del difunto
   * @returns El difunto creado
   */
  async createDeceased(data: Prisma.DeceasedCreateInput) {
    return this.prisma.deceased.create({ data });
  }

  /**
   * Busca un difunto por ID dentro de un tenant específico.
   *
   * @param tenantId - Identificador del tenant
   * @param id - Identificador del difunto
   * @returns El difunto o null si no existe o pertenece a otro tenant
   */
  async findDeceasedByTenant(tenantId: string, id: string) {
    return this.prisma.deceased.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }
}
