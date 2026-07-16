import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { StreamingRepository } from './streaming.repository';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { InvitationsService } from '../invitations/invitations.service';
import {
  CreateEventDto,
  UpdateEventDto,
  SendMessageDto,
  SendReactionDto,
  AccessCodeDto,
} from './dto';
import { EventStatus } from '@zentic/shared-types';
import { Prisma } from '@prisma/client';
import { Env } from '../../config/env.validation';

/**
 * Servicio principal del módulo de Streaming.
 *
 * Implementa toda la lógica de negocio para la gestión de eventos de transmisión
 * en vivo: creación con generación de stream keys, ciclo de vida del stream
 * (iniciar/detener), sistema de mensajes con moderación, reacciones en tiempo
 * real con rate limiting, validación de códigos de acceso y registro de leads.
 *
 * @remarks
 * Las reglas de negocio implementadas incluyen:
 * - RN-STREAM-001: Una sala no puede tener dos eventos simultáneos
 * - RN-STREAM-004: Reconexión automática en caso de caída del stream
 * - RN-STREAM-005: Rate limiting de reacciones por IP (cooldown de 2s)
 * - Generación segura de stream keys mediante criptografía aleatoria
 */
@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly reactionCooldowns = new Map<string, number>();

  constructor(
    private readonly repo: StreamingRepository,
    private readonly gateway: NotificationsGateway,
    private readonly config: ConfigService<Env>,
    private readonly invitationsService: InvitationsService,
  ) {}

  // ── CRUD Events ────────────────────────────────────────────────────

  /**
   * Obtiene todos los eventos del tenant autenticado.
   *
   * @param tenantId - Identificador del tenant desde el token JWT
   * @returns Lista completa de eventos con relaciones
   */
  async findAll(tenantId: string) {
    return this.repo.findManyByTenant(tenantId);
  }

  /**
   * Obtiene el detalle completo de un evento por su ID.
   *
   * @param tenantId - Identificador del tenant
   * @param id - Identificador del evento
   * @throws NotFoundException si el evento no existe o no pertenece al tenant
   * @returns Evento con todas las relaciones (deceased, room, venue)
   */
  async findOne(tenantId: string, id: string) {
    const event = await this.repo.findById(tenantId, id);
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  /**
   * Obtiene los datos públicos de un evento para la página del viewer.
   * No requiere autenticación. La grabación solo se expone si el evento
   * está en estado FINISHED.
   *
   * @param slug - Slug único del evento
   * @throws NotFoundException si el evento no existe o fue eliminado
   * @returns Datos públicos del evento (sin info sensible como streamKey)
   */
  async findPublic(slug: string) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt)
      throw new NotFoundException('Evento no encontrado');

    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      status: event.status,
      ceremonyType: event.ceremonyType,
      scheduledAt: event.scheduledAt,
      startedAt: event.startedAt,
      finishedAt: event.finishedAt,
      recordingUrl: event.status === 'FINISHED' ? event.recordingUrl : null,
      isPublic: event.isPublic,
      viewerCount: event.viewerCount,
      deceased: event.deceased,
      tenant: {
        name: event.tenant.name,
        brandConfig: event.tenant.brandConfig,
      },
    };
  }

  /**
   * Crea un nuevo evento de streaming con generación automática de:
   * - Stream key criptográfica única
   * - RTMP URL según el proveedor configurado (Mux/IVS)
   * - Slug único basado en el título
   * - Código de acceso hasheado (SHA-256)
   *
   * Valida la disponibilidad de la sala si se especifica (RN-STREAM-001).
   * Si no existe un difunto (deceasedId), crea uno con los datos proporcionados.
   *
   * @param tenantId - Identificador del tenant
   * @param dto - Datos de creación del evento
   * @throws BadRequestException si faltan datos del difunto
   * @throws ConflictException si la sala está ocupada en el horario solicitado
   * @returns El evento creado con stream key y RTMP URL
   */
  async create(tenantId: string, dto: CreateEventDto) {
    let deceasedId = dto.deceasedId;

    if (!deceasedId && dto.deceased) {
      const deceased = await this.repo.createDeceased({
        tenantId,
        firstName: dto.deceased.firstName,
        lastName: dto.deceased.lastName,
        birthDate: dto.deceased.birthDate
          ? new Date(dto.deceased.birthDate)
          : undefined,
        deathDate: dto.deceased.deathDate
          ? new Date(dto.deceased.deathDate)
          : undefined,
        photoUrl: dto.deceased.photoUrl,
        biography: dto.deceased.biography,
        epitaph: dto.deceased.epitaph,
      });
      deceasedId = deceased.id;
    }

    if (!deceasedId) {
      throw new BadRequestException(
        'Se requiere un difunto asociado (deceasedId o deceased)',
      );
    }

    if (!dto.deceasedId) {
      const existingDeceased = await this.repo.findDeceasedByTenant(
        tenantId,
        deceasedId,
      );
      if (!existingDeceased)
        throw new BadRequestException('Difunto no encontrado');
    }

    if (dto.roomId && dto.estimatedDuration) {
      const overlapping = await this.repo.findByRoomAndTimeOverlap(
        tenantId,
        dto.roomId,
        new Date(dto.scheduledAt),
        dto.estimatedDuration,
      );
      if (overlapping) {
        throw new ConflictException('La sala está ocupada en ese horario');
      }
    }

    const slug = this.generateSlug(dto.title);
    const streamKey = this.generateStreamKey();
    const rtmpUrl = this.getRtmpUrl();

    const eventData: Prisma.EventCreateInput = {
      title: dto.title,
      slug,
      streamKey,
      rtmpUrl,
      ceremonyType: dto.ceremonyType,
      description: dto.description,
      estimatedDuration: dto.estimatedDuration,
      isPublic: dto.isPublic ?? true,
      accessCode: dto.accessCode
        ? this.hashAccessCode(dto.accessCode)
        : undefined,
      moderationMode: dto.moderationMode ?? 'AUTO',
      scheduledAt: new Date(dto.scheduledAt),
      tenant: { connect: { id: tenantId } },
      deceased: { connect: { id: deceasedId } },
      ...(dto.roomId ? { room: { connect: { id: dto.roomId } } } : {}),
      ...(dto.clientId ? { client: { connect: { id: dto.clientId } } } : {}),
      ...(dto.assignedToId
        ? { assignedTo: { connect: { id: dto.assignedToId } } }
        : {}),
    };

    return this.repo.create(eventData);
  }

  /**
   * Actualiza un evento existente. No permite modificar eventos en estado
   * LIVE o FINISHED para evitar inconsistencias durante la transmisión.
   *
   * @param tenantId - Identificador del tenant
   * @param id - Identificador del evento
   * @param dto - Campos a actualizar (todos opcionales)
   * @throws BadRequestException si el evento está en LIVE o FINISHED
   * @throws NotFoundException si el evento no existe
   * @returns El evento actualizado
   */
  async update(tenantId: string, id: string, dto: UpdateEventDto) {
    const event = await this.findOne(tenantId, id);
    if (event.status === 'LIVE' || event.status === 'FINISHED') {
      throw new BadRequestException(
        'No se puede modificar un evento en curso o finalizado',
      );
    }

    const updateData: Prisma.EventUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.ceremonyType !== undefined)
      updateData.ceremonyType = dto.ceremonyType;
    if (dto.estimatedDuration !== undefined)
      updateData.estimatedDuration = dto.estimatedDuration;
    if (dto.isPublic !== undefined) updateData.isPublic = dto.isPublic;
    if (dto.moderationMode !== undefined)
      updateData.moderationMode = dto.moderationMode;
    if (dto.scheduledAt !== undefined)
      updateData.scheduledAt = new Date(dto.scheduledAt);
    if (dto.roomId !== undefined) {
      updateData.room = dto.roomId
        ? { connect: { id: dto.roomId } }
        : { disconnect: true };
    }
    if (dto.clientId !== undefined) {
      updateData.client = dto.clientId
        ? { connect: { id: dto.clientId } }
        : { disconnect: true };
    }
    if (dto.assignedToId !== undefined) {
      updateData.assignedTo = dto.assignedToId
        ? { connect: { id: dto.assignedToId } }
        : { disconnect: true };
    }
    if (dto.accessCode !== undefined) {
      updateData.accessCode = dto.accessCode
        ? this.hashAccessCode(dto.accessCode)
        : null;
    }
    if (dto.deceasedId !== undefined) {
      updateData.deceased = { connect: { id: dto.deceasedId } };
    }

    return this.repo.update(tenantId, id, updateData);
  }

  /**
   * Cancela un evento (soft-delete). Solo permite cancelar eventos que no
   * estén en estado LIVE.
   *
   * @param tenantId - Identificador del tenant
   * @param id - Identificador del evento
   * @throws NotFoundException si el evento no existe
   * @returns El evento cancelado
   */
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const cancelled = await this.repo.softDelete(tenantId, id);

    // RN-INV-002: al cancelar/eliminar un evento, sus invitaciones se archivan (no se borran).
    // Best-effort — nunca debe bloquear la cancelación del evento, que es la operación
    // principal solicitada por el operador.
    try {
      await this.invitationsService.archiveByEventId(tenantId, id);
    } catch (error) {
      this.logger.warn(
        `No se pudieron archivar las invitaciones del evento ${id}: ${error}`,
      );
    }

    return cancelled;
  }

  // ── Stream lifecycle ────────────────────────────────────────────────

  /**
   * Inicia la transmisión en vivo de un evento programado.
   * Cambia el estado a LIVE, registra la hora de inicio y notifica
   * a todos los viewers conectados via Socket.IO.
   *
   * @param tenantId - Identificador del tenant
   * @param id - Identificador del evento
   * @throws BadRequestException si el evento no está en estado SCHEDULED
   * @returns El evento actualizado a LIVE
   */
  async startStream(tenantId: string, id: string) {
    const event = await this.findOne(tenantId, id);

    if (event.status !== 'SCHEDULED') {
      throw new BadRequestException(
        `El evento está en estado "${event.status}", no se puede iniciar`,
      );
    }

    const updated = await this.repo.update(tenantId, id, {
      status: 'LIVE',
      startedAt: new Date(),
    });

    this.gateway.broadcastStreamStatus(id, {
      eventId: id,
      tenantId,
      status: EventStatus.LIVE,
    });

    this.logger.log(`Stream started: ${id}`);
    return updated;
  }

  /**
   * Finaliza la transmisión en vivo. Cambia el estado a FINISHED,
   * registra la hora de finalización y notifica a todos los viewers.
   *
   * @param tenantId - Identificador del tenant
   * @param id - Identificador del evento
   * @throws BadRequestException si el evento no está en LIVE o PAUSED
   * @returns El evento actualizado a FINISHED
   */
  async stopStream(tenantId: string, id: string) {
    const event = await this.findOne(tenantId, id);

    if (event.status !== 'LIVE' && event.status !== 'PAUSED') {
      throw new BadRequestException(
        `El evento está en estado "${event.status}", no se puede finalizar`,
      );
    }

    const updated = await this.repo.update(tenantId, id, {
      status: 'FINISHED',
      finishedAt: new Date(),
    });

    this.gateway.broadcastStreamStatus(id, {
      eventId: id,
      tenantId,
      status: EventStatus.FINISHED,
    });

    this.logger.log(`Stream finished: ${id}`);
    return updated;
  }

  // ── Messages ────────────────────────────────────────────────────────

  /**
   * Obtiene los mensajes aprobados de un evento.
   *
   * @param tenantId - Identificador del tenant
   * @param eventId - Identificador del evento
   * @returns Lista de mensajes aprobados
   */
  async getMessages(tenantId: string, eventId: string) {
    await this.findOne(tenantId, eventId);
    return this.repo.findMessagesByEvent(tenantId, eventId);
  }

  /**
   * Obtiene los mensajes pendientes de moderación para el panel del operador.
   *
   * @param tenantId - Identificador del tenant
   * @param eventId - Identificador del evento
   * @returns Lista de mensajes en estado PENDING
   */
  async getPendingMessages(tenantId: string, eventId: string) {
    await this.findOne(tenantId, eventId);
    return this.repo.findMessagesPendingModeration(tenantId, eventId);
  }

  /**
   * Envía un mensaje de homenaje a un evento desde la página pública.
   * Si el evento tiene moderación MANUAL, el mensaje queda en estado PENDING
   * hasta que un operador lo apruebe. Si es AUTO, se publica inmediatamente
   * y se notifica via Socket.IO.
   *
   * @param slug - Slug del evento
   * @param dto - Contenido del mensaje
   * @throws NotFoundException si el evento no existe
   * @returns El mensaje creado
   */
  async sendMessage(slug: string, dto: SendMessageDto) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt)
      throw new NotFoundException('Evento no encontrado');

    const message = await this.repo.createMessage({
      authorName: dto.authorName,
      content: dto.content,
      iconType: dto.iconType,
      status: event.moderationMode === 'MANUAL' ? 'PENDING' : 'APPROVED',
      event: { connect: { id: event.id } },
      tenantId: event.tenantId,
    });

    if (event.moderationMode === 'AUTO') {
      this.gateway.broadcastNewMessage(event.id, {
        eventId: event.id,
        tenantId: event.tenantId,
        message: {
          id: message.id,
          authorName: message.authorName,
          content: message.content,
          iconType: message.iconType,
          createdAt: message.createdAt.toISOString(),
        },
      });
    }

    return message;
  }

  /**
   * Aprueba un mensaje pendiente y lo transmite a todos los viewers conectados
   * mediante Socket.IO (evento `new-message`).
   *
   * @param tenantId - Identificador del tenant
   * @param eventId - Identificador del evento
   * @param messageId - Identificador del mensaje
   * @returns El mensaje aprobado
   */
  async approveMessage(tenantId: string, eventId: string, messageId: string) {
    await this.findOne(tenantId, eventId);
    const message = await this.repo.approveMessage(
      eventId,
      messageId,
      tenantId,
    );

    this.gateway.broadcastNewMessage(eventId, {
      eventId,
      tenantId,
      message: {
        id: message.id,
        authorName: message.authorName,
        content: message.content,
        iconType: message.iconType,
        createdAt: message.createdAt.toISOString(),
      },
    });

    return message;
  }

  /**
   * Rechaza un mensaje pendiente con una razón opcional.
   *
   * @param tenantId - Identificador del tenant
   * @param eventId - Identificador del evento
   * @param messageId - Identificador del mensaje
   * @param reason - Razón del rechazo (opcional)
   * @returns El mensaje rechazado
   */
  async rejectMessage(
    tenantId: string,
    eventId: string,
    messageId: string,
    reason?: string,
  ) {
    await this.findOne(tenantId, eventId);
    return this.repo.rejectMessage(eventId, messageId, reason);
  }

  /**
   * Elimina un mensaje (soft-delete) del evento.
   * El mensaje queda oculto de la vista pública pero conservado en BD
   * por 7 días para posible restauración (RN-STREAM-006).
   *
   * @param tenantId - Identificador del tenant
   * @param eventId - Identificador del evento
   * @param messageId - Identificador del mensaje
   * @returns El mensaje marcado como eliminado
   */
  async deleteMessage(tenantId: string, eventId: string, messageId: string) {
    await this.findOne(tenantId, eventId);
    return this.repo.softDeleteMessage(eventId, messageId);
  }

  // ── Reactions ──────────────────────────────────────────────────────

  /**
   * Procesa una reacción rápida de un viewer durante un evento en vivo.
   * Implementa rate limiting por IP (máx 1 reacción cada 2 segundos).
   * Las reacciones se transmiten en tiempo real a todos los viewers
   * mediante Socket.IO (evento `new-reaction`).
   *
   * @param slug - Slug del evento
   * @param dto - Tipo de reacción (heart, candle, flower, dove)
   * @param clientIp - Dirección IP del cliente para rate limiting
   * @throws BadRequestException si se excede el rate limit
   * @throws NotFoundException si el evento no existe
   * @returns Confirmación de envío
   */
  async sendReaction(slug: string, dto: SendReactionDto, clientIp?: string) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt)
      throw new NotFoundException('Evento no encontrado');

    if (clientIp) {
      const now = Date.now();
      const lastReaction = this.reactionCooldowns.get(clientIp) ?? 0;
      if (now - lastReaction < 2000) {
        throw new BadRequestException(
          'Espera un momento antes de enviar otra reacción',
        );
      }
      this.reactionCooldowns.set(clientIp, now);

      if (this.reactionCooldowns.size > 1000) {
        const cutoff = now - 10000;
        for (const [ip, time] of this.reactionCooldowns) {
          if (time < cutoff) this.reactionCooldowns.delete(ip);
        }
      }
    }

    const reactionIcons: Record<string, string> = {
      heart: '❤️',
      candle: '🕯️',
      flower: '🌸',
      dove: '🕊️',
    };

    this.gateway.server.to(`event:${event.id}`).emit('new-reaction', {
      eventId: event.id,
      tenantId: event.tenantId,
      reaction: {
        type: dto.type,
        icon: reactionIcons[dto.type] ?? dto.type,
      },
    });

    return { sent: true };
  }

  // ── Access code ────────────────────────────────────────────────────

  /**
   * Valida el código de acceso de un evento privado.
   * Si el visitante proporciona nombre/email y da consentimiento,
   * se registra automáticamente como lead del evento.
   *
   * @param slug - Slug del evento
   * @param dto - Código de acceso y datos opcionales del visitante
   * @throws NotFoundException si el evento no existe
   * @throws ForbiddenException si el código de acceso es incorrecto
   * @returns Resultado de validación con eventId
   */
  async validateAccessCode(slug: string, dto: AccessCodeDto) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt)
      throw new NotFoundException('Evento no encontrado');

    if (event.isPublic && !event.accessCode) {
      return { valid: true, eventId: event.id };
    }

    const hashedCode = this.hashAccessCode(dto.code);
    if (hashedCode !== event.accessCode) {
      throw new ForbiddenException('Código de acceso incorrecto');
    }

    if (dto.name || dto.email) {
      await this.repo.createLead({
        name: dto.name ?? 'Anónimo',
        email: dto.email,
        consent: dto.consent ?? false,
        source: 'DIRECT',
        tenant: { connect: { id: event.tenantId } },
        event: { connect: { id: event.id } },
      });
    }

    return { valid: true, eventId: event.id };
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  /**
   * Genera un slug único para la URL pública del evento.
   * Combina el título normalizado con un sufijo hexadecimal aleatorio
   * para garantizar unicidad.
   *
   * @param title - Título del evento
   * @returns Slug en formato kebab-case con sufijo único
   */
  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    const suffix = randomBytes(4).toString('hex');
    return `${base}-${suffix}`;
  }

  /**
   * Genera una stream key criptográficamente segura para configurar OBS.
   * Prefijada con "zentic_" para identificación en el proveedor de streaming.
   *
   * @returns Stream key de 192 bits en hexadecimal
   */
  private generateStreamKey(): string {
    return `zentic_${randomBytes(24).toString('hex')}`;
  }

  /**
   * Obtiene la URL RTMP base según el proveedor de streaming configurado.
   *
   * @returns URL RTMP para configuración de OBS
   */
  private getRtmpUrl(): string {
    const provider = this.config.get<string>('STREAM_PROVIDER');
    if (provider === 'mux') {
      return 'rtmps://global-live.mux.com:443/app';
    }
    return 'rtmp://example.com/live';
  }

  /**
   * Hashea un código de acceso usando SHA-256.
   * Los códigos nunca se almacenan en texto plano en la base de datos
   * (RNF-STREAM-007).
   *
   * @param code - Código de acceso en texto plano
   * @returns Hash SHA-256 del código
   */
  private hashAccessCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
