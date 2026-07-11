import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus, MessageStatus, Prisma } from '@prisma/client';

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
        deceased: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        room: { select: { id: true, name: true, venue: { select: { name: true } } } },
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
      },
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
  async create(data: Prisma.EventCreateInput) {
    return this.prisma.event.create({ data });
  }

  /**
   * Actualiza un evento existente validando que pertenezca al tenant.
   *
   * @param tenantId - Identificador del tenant (validación de seguridad)
   * @param id - Identificador del evento a actualizar
   * @param data - Campos a actualizar
   * @returns El evento actualizado
   */
  async update(tenantId: string, id: string, data: Prisma.EventUpdateInput) {
    return this.prisma.event.update({
      where: { id },
      data,
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
      where: { id },
      data: { deletedAt: new Date(), status: 'CANCELLED' as EventStatus },
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
    const endTime = new Date(scheduledAt.getTime() + estimatedDuration * 60000);
    return this.prisma.event.findFirst({
      where: {
        tenantId,
        roomId,
        deletedAt: null,
        status: { notIn: ['CANCELLED' as EventStatus, 'FINISHED' as EventStatus] },
        id: excludeId ? { not: excludeId } : undefined,
        scheduledAt: { lt: endTime },
      },
    });
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
        status: 'PENDING' as MessageStatus,
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
  async approveMessage(eventId: string, messageId: string, approvedBy: string) {
    return this.prisma.message.update({
      where: { id: messageId, eventId },
      data: { status: 'APPROVED' as MessageStatus, approvedBy, approvedAt: new Date() },
    });
  }

  /**
   * Rechaza un mensaje, opcionalmente con una razón del rechazo.
   *
   * @param eventId - Identificador del evento
   * @param messageId - Identificador del mensaje a rechazar
   * @param reason - Razón opcional del rechazo (visible para el autor)
   * @returns El mensaje actualizado a estado REJECTED
   */
  async rejectMessage(eventId: string, messageId: string, reason?: string) {
    return this.prisma.message.update({
      where: { id: messageId, eventId },
      data: { status: 'REJECTED' as MessageStatus, rejectedReason: reason ?? null },
    });
  }

  /**
   * Soft-delete de un mensaje (lo oculta de la vista pública).
   * El administrador puede restaurarlo hasta 7 días después (RN-STREAM-006).
   *
   * @param eventId - Identificador del evento
   * @param messageId - Identificador del mensaje a eliminar
   * @returns El mensaje marcado como eliminado
   */
  async softDeleteMessage(eventId: string, messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId, eventId },
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
  async updateViewerCount(eventId: string, count: number) {
    return this.prisma.event.update({
      where: { id: eventId },
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
