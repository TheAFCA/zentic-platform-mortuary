import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash, createHmac } from 'crypto';
import { StreamingRepository } from './streaming.repository';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { EmailService } from '../email/email.service';
import {
  StreamProvider,
  StreamWebhookEvent,
  STREAM_PROVIDER_TOKEN,
  UnknownProviderError,
  NoSignalError,
} from './providers/stream-provider.interface';
import {
  resolveProviderForEvent,
  withProviderTimeout,
} from './providers/stream-provider.factory';
import { MuxStreamProvider } from './providers/mux-stream.provider';
import { CloudflareStreamProvider } from './providers/cloudflare-stream.provider';
import {
  CreateEventDto,
  UpdateEventDto,
  SendMessageDto,
  SendReactionDto,
  AccessCodeDto,
} from './dto';
import { EventStatus, JwtPayload } from '@zentic/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { Env } from '../../config/env.validation';
import { StreamAccessService } from './stream-access.service';
import { EventStateMachineService } from './domain/event-state-machine.service';
import { TransitionContext } from './domain/event-state-machine.service';
import { ProvisioningSagaService } from './domain/provisioning-saga.service';

/**
 * Servicio principal del módulo de Streaming.
 *
 * Implementa toda la lógica de negocio para la gestión de eventos de transmisión
 * en vivo: creación de live streams reales vía el proveedor configurado
 * (Mux/Cloudflare Stream), ciclo de vida del stream (iniciar/detener),
 * sistema de mensajes con moderación, reacciones en tiempo real con rate
 * limiting, validación de códigos de acceso y registro de leads.
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
    @Inject(STREAM_PROVIDER_TOKEN) private readonly provider: StreamProvider,
    private readonly muxProvider: MuxStreamProvider,
    private readonly cloudflareProvider: CloudflareStreamProvider,
    private readonly emailService: EmailService,
    private readonly streamAccess: StreamAccessService,
    private readonly stateMachine: EventStateMachineService,
    private readonly prisma: PrismaService,
    private readonly provisioningSaga: ProvisioningSagaService,
  ) {}

  // ── CRUD Events ────────────────────────────────────────────────────

  /**
   * Obtiene todos los eventos del tenant autenticado.
   *
   * @param tenantId - Identificador del tenant desde el token JWT
   * @returns Lista completa de eventos con relaciones
   */
  async findAll(tenantId: string) {
    const events = await this.repo.findManyByTenant(tenantId);
    return events.map((event) => this.withoutStreamingSecrets(event));
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
    const event = await this.findOneEntity(tenantId, id);
    const needsPlayback =
      event.status === 'LIVE' || event.status === 'FINISHED';
    const playbackUrl = needsPlayback
      ? await this.resolvePlaybackUrl(event)
      : null;
    return { ...this.withoutStreamingSecrets(event), playbackUrl };
  }

  /** Obtiene una vista enmascarada de las credenciales RTMP. */
  async getCredentials(tenantId: string, id: string) {
    const event = await this.findOneEntity(tenantId, id);
    return {
      streamKey: this.maskSecret(event.streamKey),
      rtmpUrl: event.rtmpUrl,
      revealed: false,
    };
  }

  async revealCredentials(
    tenantId: string,
    id: string,
    actor: JwtPayload,
    ipAddress?: string,
  ) {
    const event = await this.findOneEntity(tenantId, id);
    await this.repo.createCredentialAudit({
      actorId: actor.sub,
      role: actor.role,
      tenantId,
      eventId: id,
      action: 'STREAM_KEY_REVEALED',
      ipAddress,
    });
    return {
      streamKey: event.streamKey,
      rtmpUrl: event.rtmpUrl,
      revealed: true,
    };
  }

  async rotateStreamKey(
    tenantId: string,
    id: string,
    actor: JwtPayload,
    ipAddress?: string,
  ) {
    const event = await this.findOneEntity(tenantId, id);
    if (event.status === 'LIVE' || event.status === 'PAUSED') {
      throw new ConflictException(
        'No se puede rotar la stream key durante una transmisión activa',
      );
    }
    if (!event.providerStreamId || event.provider !== 'mux') {
      throw new BadRequestException(
        'El evento no tiene un stream Mux rotatable',
      );
    }
    const streamKey = await this.muxProvider.resetStreamKey(
      event.providerStreamId,
    );
    await this.repo.update(tenantId, id, { streamKey });
    await this.repo.createCredentialAudit({
      actorId: actor.sub,
      role: actor.role,
      tenantId,
      eventId: id,
      action: 'STREAM_KEY_ROTATED',
      ipAddress,
    });
    return { streamKey, rtmpUrl: event.rtmpUrl, revealed: true };
  }

  async auditCredentialCopy(
    tenantId: string,
    id: string,
    actor: JwtPayload,
    ipAddress?: string,
  ) {
    await this.findOneEntity(tenantId, id);
    await this.repo.createCredentialAudit({
      actorId: actor.sub,
      role: actor.role,
      tenantId,
      eventId: id,
      action: 'STREAM_KEY_COPIED',
      ipAddress,
    });
    return { recorded: true };
  }

  private async findOneEntity(tenantId: string, id: string) {
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
  async findPublic(slug: string, accessToken?: string) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt)
      throw new NotFoundException('Evento no encontrado');

    const hasAccess =
      event.isPublic ||
      (await this.streamAccess.canAccess(accessToken, event.id));

    const playbackUrl = hasAccess ? await this.resolvePlaybackUrl(event) : null;

    return {
      id: hasAccess ? event.id : null,
      title: event.title,
      slug: event.slug,
      status: event.status,
      ceremonyType: event.ceremonyType,
      scheduledAt: event.scheduledAt,
      startedAt: event.startedAt,
      finishedAt: event.finishedAt,
      recordingUrl:
        hasAccess && event.status === 'FINISHED' ? playbackUrl : null,
      playbackUrl,
      recordingReady: event.recordingReady,
      isPublic: event.isPublic,
      viewerCount: event.viewerCount,
      deceased: hasAccess ? event.deceased : null,
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

    // Crear streaming "desde" un obituario: el difunto viene del obituario
    // (se ignora cualquier deceasedId/deceased que haya mandado el cliente),
    // y al final se autovincula Obituary.eventId al evento nuevo.
    if (dto.obituaryId) {
      const obituary = await this.repo.findObituaryByTenant(
        tenantId,
        dto.obituaryId,
      );
      if (!obituary) throw new NotFoundException('Obituario no encontrado');
      if (obituary.eventId) {
        throw new ConflictException(
          'Este obituario ya tiene una transmisión vinculada',
        );
      }
      deceasedId = obituary.deceasedId;
    }

    if (!deceasedId && !dto.deceased) {
      throw new BadRequestException(
        'Se requiere un difunto asociado (deceasedId o deceased)',
      );
    }

    if (dto.deceasedId && !dto.obituaryId) {
      const existingDeceased = await this.repo.findDeceasedByTenant(
        tenantId,
        dto.deceasedId,
      );
      if (!existingDeceased)
        throw new BadRequestException('Difunto no encontrado');
    }

    if (dto.roomId) {
      const existingRoom = await this.repo.findRoomByTenant(
        tenantId,
        dto.roomId,
      );
      if (!existingRoom) throw new NotFoundException('Sala no encontrada');
    }

    if (dto.clientId) {
      const existingClient = await this.repo.findClientByTenant(
        tenantId,
        dto.clientId,
      );
      if (!existingClient) throw new NotFoundException('Cliente no encontrado');
    }

    if (dto.assignedToId) {
      const existingUser = await this.repo.findUserByTenant(
        tenantId,
        dto.assignedToId,
      );
      if (!existingUser)
        throw new NotFoundException('Usuario asignado no encontrado');
    }

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

    const slug = this.generateSlug(dto.title);

    const eventData: Omit<Prisma.EventCreateInput, 'scheduledAt'> & {
      scheduledAt: Date;
    } = {
      title: dto.title,
      slug,
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
      deceased: { connect: { id: deceasedId! } },
      ...(dto.roomId ? { room: { connect: { id: dto.roomId } } } : {}),
      ...(dto.clientId ? { client: { connect: { id: dto.clientId } } } : {}),
      ...(dto.assignedToId
        ? { assignedTo: { connect: { id: dto.assignedToId } } }
        : {}),
    };

    // SCHED-06: overlap check + creation en transacción con reintento
    const event = await this.withOverlapCheck(
      tenantId,
      dto.roomId,
      eventData.scheduledAt,
      dto.estimatedDuration,
      undefined,
      async (tx) => {
        const created = await this.repo.create(eventData, tx);
        if (dto.obituaryId) {
          await this.repo.linkObituary(
            tenantId,
            dto.obituaryId,
            created.id,
            tx,
          );
        }
        return created;
      },
    );

    // Iniciar saga de aprovisionamiento asíncrona (LIFE-09, LIFE-10, LIFE-11, LIFE-12)
    this.provisioningSaga
      .provisionEvent(tenantId, event.id, eventData.isPublic ?? true)
      .catch((err) => this.logger.error(`Provisioning saga failed: ${err}`));

    return this.withoutStreamingSecrets(event);
  }

  async getPlayback(slug: string, accessToken?: string) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt) {
      throw new NotFoundException('Evento no encontrado');
    }
    await this.assertViewerAccess(event, accessToken);
    const url = await this.resolvePlaybackUrl(event);
    if (!url) throw new NotFoundException('Playback no disponible');
    return { url };
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
    const event = await this.findOneEntity(tenantId, id);
    if (event.status === 'LIVE' || event.status === 'FINISHED') {
      throw new BadRequestException(
        'No se puede modificar un evento en curso o finalizado',
      );
    }

    if (dto.roomId !== undefined && dto.roomId) {
      const existingRoom = await this.repo.findRoomByTenant(
        tenantId,
        dto.roomId,
      );
      if (!existingRoom) throw new NotFoundException('Sala no encontrada');
    }

    const effectiveRoomId = dto.roomId ?? event.roomId;
    const effectiveScheduledAt = dto.scheduledAt
      ? new Date(dto.scheduledAt)
      : event.scheduledAt;
    if (dto.clientId !== undefined && dto.clientId) {
      const existingClient = await this.repo.findClientByTenant(
        tenantId,
        dto.clientId,
      );
      if (!existingClient) throw new NotFoundException('Cliente no encontrado');
    }

    if (dto.assignedToId !== undefined && dto.assignedToId) {
      const existingUser = await this.repo.findUserByTenant(
        tenantId,
        dto.assignedToId,
      );
      if (!existingUser)
        throw new NotFoundException('Usuario asignado no encontrado');
    }

    if (dto.deceasedId !== undefined) {
      const existingDeceased = await this.repo.findDeceasedByTenant(
        tenantId,
        dto.deceasedId,
      );
      if (!existingDeceased)
        throw new BadRequestException('Difunto no encontrado');
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

    const updated = await this.withOverlapCheck(
      tenantId,
      effectiveRoomId,
      effectiveScheduledAt,
      dto.estimatedDuration ?? event.estimatedDuration,
      id,
      (tx) => this.repo.update(tenantId, id, updateData, tx),
    );
    return this.withoutStreamingSecrets(updated);
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
    const event = await this.findOneEntity(tenantId, id);
    if (event.status === 'LIVE' || event.status === 'PAUSED') {
      throw new ConflictException(
        'No se puede cancelar un evento con una transmisión activa',
      );
    }
    const removed = await this.repo.softDelete(tenantId, id);
    return this.withoutStreamingSecrets(removed);
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
    const event = await this.findOneEntity(tenantId, id);

    if (event.status === 'LIVE') {
      this.logger.log(`startStream idempotente: evento ${id} ya está en LIVE`);
      return this.withoutStreamingSecrets(event);
    }

    const eventProvider = this.resolveProvider(event);
    // Nunca persistir LIVE hasta confirmar que el proveedor recibe video.
    if (event.providerStreamId) {
      try {
        const status = await withProviderTimeout(
          eventProvider,
          'getStreamStatus',
          () => eventProvider.getStreamStatus(event.providerStreamId!),
        );
        if (status !== 'active') {
          throw new NoSignalError(event.providerStreamId);
        }
      } catch (error) {
        if (error instanceof NoSignalError) {
          throw new BadRequestException(
            'No se detecta señal de video. Verifica la configuración del OBS.',
          );
        }
        this.logger.error(
          `No se pudo verificar estado del proveedor para evento ${id}: ${error}`,
        );
        throw new ServiceUnavailableException(
          'No se pudo verificar la señal de video. Intenta nuevamente.',
        );
      }
    }

    const transitionResult = await this.stateMachine.transitionIdempotent(
      tenantId,
      id,
      event.status,
      'LIVE',
      'start_stream',
      {
        tenantId,
        eventId: id,
        actorId: event.assignedToId ?? undefined,
        source: 'start_stream',
      },
    );

    if (!transitionResult.success) {
      throw new BadRequestException(
        transitionResult.error ?? 'No se pudo iniciar la transmisión',
      );
    }

    this.gateway.broadcastStreamStatus(id, {
      eventId: id,
      tenantId,
      status: EventStatus.LIVE,
    });

    await this.notifyLeadsStreamStarted(tenantId, event.slug, event.title, id);

    this.logger.log(`Stream started: ${id}`);
    const updated = await this.findOneEntity(tenantId, id);
    return this.withoutStreamingSecrets(updated);
  }

  /**
   * Envía un email a los leads del evento que dejaron su correo, avisando
   * que la transmisión ya comenzó (RF-STREAM-011). Un fallo individual de
   * envío no debe interrumpir el inicio del stream.
   */
  private async notifyLeadsStreamStarted(
    tenantId: string,
    slug: string,
    eventTitle: string,
    eventId: string,
  ): Promise<void> {
    const leads = await this.repo.findLeadsWithEmailByEvent(tenantId, eventId);
    if (!leads.length) return;

    const consentingLeads = leads.filter(
      (l): l is typeof l & { email: string } => l.consent === true && !!l.email,
    );

    if (!consentingLeads.length) return;

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const eventUrl = `${frontendUrl}/e/${slug}`;

    const results = await Promise.allSettled(
      consentingLeads.map((lead) =>
        this.emailService.sendStreamStartedEmail({
          to: lead.email,
          eventTitle,
          eventUrl,
        }),
      ),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Failed to send stream-started email: ${result.reason}`,
        );
      }
    }
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
    const event = await this.findOneEntity(tenantId, id);

    if (event.status === 'FINISHED') {
      this.logger.log(
        `stopStream idempotente: evento ${id} ya está en FINISHED`,
      );
      return this.withoutStreamingSecrets(event);
    }

    if (
      event.status !== 'LIVE' &&
      event.status !== 'PAUSED' &&
      event.status !== 'INTERRUPTED'
    ) {
      throw new BadRequestException(
        `El evento está en estado "${event.status}", no se puede finalizar`,
      );
    }

    const eventProvider = this.resolveProvider(event);
    const transitionResult = await this.stateMachine.transitionIdempotent(
      tenantId,
      id,
      event.status,
      'FINISHED',
      'stop_stream',
      {
        tenantId,
        eventId: id,
        actorId: event.assignedToId ?? undefined,
        source: 'stop_stream',
      },
    );

    if (!transitionResult.success) {
      throw new BadRequestException(
        transitionResult.error ?? 'No se pudo finalizar la transmisión',
      );
    }

    if (event.providerStreamId) {
      try {
        await withProviderTimeout(eventProvider, 'disableLiveStream', () =>
          eventProvider.disableLiveStream(event.providerStreamId!),
        );
      } catch (error) {
        this.logger.warn(
          `Error al deshabilitar stream remoto ${event.providerStreamId}: ${error}`,
        );
      }
    }

    this.gateway.broadcastStreamStatus(id, {
      eventId: id,
      tenantId,
      status: EventStatus.FINISHED,
    });

    this.logger.log(`Stream finished: ${id}`);
    const updated = await this.findOneEntity(tenantId, id);
    return this.withoutStreamingSecrets(updated);
  }

  async pauseStream(tenantId: string, id: string) {
    const event = await this.findOneEntity(tenantId, id);

    if (event.status !== 'LIVE') {
      throw new BadRequestException(
        `El evento está en estado "${event.status}", no se puede pausar`,
      );
    }

    const transitionResult = await this.stateMachine.transitionIdempotent(
      tenantId,
      id,
      event.status,
      'PAUSED',
      'pause_stream',
      {
        tenantId,
        eventId: id,
        actorId: event.assignedToId ?? undefined,
        source: 'pause_stream',
      },
    );

    if (!transitionResult.success) {
      throw new BadRequestException(
        transitionResult.error ?? 'No se pudo pausar la transmisión',
      );
    }

    this.gateway.broadcastStreamStatus(id, {
      eventId: id,
      tenantId,
      status: EventStatus.PAUSED,
    });

    this.logger.log(`Stream paused: ${id}`);
    const updated = await this.findOneEntity(tenantId, id);
    return this.withoutStreamingSecrets(updated);
  }

  async resumeStream(tenantId: string, id: string) {
    const event = await this.findOneEntity(tenantId, id);

    if (event.status !== 'PAUSED') {
      throw new BadRequestException(
        `El evento está en estado "${event.status}", no se puede reanudar`,
      );
    }

    const transitionResult = await this.stateMachine.transitionIdempotent(
      tenantId,
      id,
      event.status,
      'LIVE',
      'resume_stream',
      {
        tenantId,
        eventId: id,
        actorId: event.assignedToId ?? undefined,
        source: 'resume_stream',
      },
    );

    if (!transitionResult.success) {
      throw new BadRequestException(
        transitionResult.error ?? 'No se pudo reanudar la transmisión',
      );
    }

    this.gateway.broadcastStreamStatus(id, {
      eventId: id,
      tenantId,
      status: EventStatus.LIVE,
    });

    this.logger.log(`Stream resumed: ${id}`);
    const updated = await this.findOneEntity(tenantId, id);
    return this.withoutStreamingSecrets(updated);
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
    await this.findOneEntity(tenantId, eventId);
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
    await this.findOneEntity(tenantId, eventId);
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
  async sendMessage(slug: string, dto: SendMessageDto, accessToken?: string) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt)
      throw new NotFoundException('Evento no encontrado');

    await this.assertViewerAccess(event, accessToken);

    if (event.status !== 'LIVE') {
      throw new BadRequestException(
        'No se pueden enviar mensajes en el estado actual del evento',
      );
    }

    const recentCutoff = new Date(Date.now() - 60 * 1000);
    const recentMessage = await this.prisma.message.findFirst({
      where: {
        eventId: event.id,
        authorName: dto.authorName,
        content: dto.content,
        createdAt: { gte: recentCutoff },
        deletedAt: null,
      },
    });
    if (recentMessage) {
      throw new BadRequestException(
        'Ya enviaste un mensaje similar recientemente',
      );
    }

    const message = await this.repo.createMessage({
      authorName: dto.authorName,
      content: dto.content,
      iconType: dto.iconType,
      status: event.moderationMode === 'MANUAL' ? 'PENDING' : 'APPROVED',
      event: { connect: { id: event.id } },
      tenantId: event.tenantId,
    });

    const messagePayload = {
      eventId: event.id,
      tenantId: event.tenantId,
      message: {
        id: message.id,
        authorName: message.authorName,
        content: message.content,
        iconType: message.iconType,
        createdAt: message.createdAt.toISOString(),
      },
    };

    if (event.moderationMode === 'AUTO') {
      this.gateway.broadcastNewMessage(event.id, messagePayload);
    } else {
      this.gateway.broadcastMessagePending(event.id, messagePayload);
    }

    return message;
  }

  /** Obtiene mensajes aprobados para la página pública, respetando privacidad. */
  async getPublicMessages(slug: string, accessToken?: string) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt) {
      throw new NotFoundException('Evento no encontrado');
    }
    await this.assertViewerAccess(event, accessToken);
    return this.repo.findMessagesByEvent(event.tenantId, event.id);
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
  async approveMessage(
    tenantId: string,
    eventId: string,
    messageId: string,
    approvedByUserId: string,
  ) {
    await this.findOneEntity(tenantId, eventId);

    const existingMessage = await this.prisma.message.findFirst({
      where: { id: messageId, eventId, tenantId, deletedAt: null },
    });
    if (!existingMessage || existingMessage.status !== 'PENDING') {
      throw new BadRequestException('El mensaje ya fue procesado');
    }

    const message = await this.repo.approveMessage(
      tenantId,
      eventId,
      messageId,
      approvedByUserId,
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
    await this.findOneEntity(tenantId, eventId);
    return this.repo.rejectMessage(tenantId, eventId, messageId, reason);
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
    await this.findOneEntity(tenantId, eventId);
    return this.repo.softDeleteMessage(tenantId, eventId, messageId);
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
  async sendReaction(
    slug: string,
    dto: SendReactionDto,
    clientIp?: string,
    accessToken?: string,
  ) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt)
      throw new NotFoundException('Evento no encontrado');

    await this.assertViewerAccess(event, accessToken);

    if (event.status !== 'LIVE') {
      throw new BadRequestException(
        'No se pueden enviar mensajes en el estado actual del evento',
      );
    }

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

  // ── Provider webhooks ────────────────────────────────────────────────

  /**
   * Procesa un webhook entrante de Mux. Verifica la firma y, si el evento
   * indica que la grabación está lista, actualiza `recordingUrl` del evento.
   *
   * @param rawBody - Cuerpo crudo del request (requerido para verificar la firma)
   * @param headers - Cabeceras HTTP del request
   */
  async handleMuxWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    const event = this.muxProvider.parseWebhookEvent(rawBody, headers);
    await this.processProviderWebhookEvent(event);
  }

  /**
   * Procesa un webhook entrante de Cloudflare Stream. Misma lógica que el de Mux.
   *
   * @param rawBody - Cuerpo crudo del request (requerido para verificar la firma)
   * @param headers - Cabeceras HTTP del request
   */
  async handleCloudflareWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    const event = this.cloudflareProvider.parseWebhookEvent(rawBody, headers);
    await this.processProviderWebhookEvent(event);
  }

  /**
   * Aplica el efecto de un evento de webhook ya verificado y normalizado.
   * - `recording.ready`: actualiza la grabación (ya existente)
   * - `stream.active`: sincroniza estado a LIVE si es necesario (LIFE-07)
   * - `stream.idle`: maneja pérdida de señal (LIFE-06, LIFE-07)
   * Idempotente: reescribir los mismos campos no tiene efecto secundario.
   */
  private async processProviderWebhookEvent(
    event: StreamWebhookEvent | null,
  ): Promise<void> {
    if (!event) return;

    const found = await this.repo.findByProviderStreamId(
      event.providerStreamId,
    );
    if (!found) return;

    switch (event.type) {
      case 'stream.active': {
        if (
          found.status === 'SCHEDULED' ||
          found.status === 'PAUSED' ||
          found.status === 'INTERRUPTED'
        ) {
          this.logger.log(
            `Webhook stream.active: sincronizando evento ${found.id} a LIVE`,
          );
          await this.stateMachine
            .transitionIdempotent(
              found.tenantId,
              found.id,
              found.status,
              'LIVE',
              'signal_recovered',
              {
                tenantId: found.tenantId,
                eventId: found.id,
                source: 'webhook',
              },
            )
            .catch((err) =>
              this.logger.warn(
                `Error sincronizando stream.active para ${found.id}: ${err}`,
              ),
            );
        }
        break;
      }

      case 'stream.idle': {
        if (found.status === 'LIVE' || found.status === 'PAUSED') {
          this.logger.warn(
            `Webhook stream.idle: señal perdida para evento ${found.id}`,
          );
          await this.stateMachine
            .transitionIdempotent(
              found.tenantId,
              found.id,
              found.status,
              'INTERRUPTED',
              'signal_lost',
              {
                tenantId: found.tenantId,
                eventId: found.id,
                source: 'webhook',
              },
            )
            .catch((err) =>
              this.logger.warn(
                `Error marcando stream.idle para ${found.id}: ${err}`,
              ),
            );
        }
        break;
      }

      case 'recording.ready': {
        const recordingExpiry =
          found.tenant.plan === 'ENTERPRISE'
            ? null
            : new Date(
                Date.now() +
                  (found.tenant.plan === 'PRO' ? 90 : 30) * 24 * 60 * 60 * 1000,
              );

        await this.repo.update(found.tenantId, found.id, {
          recordingUrl: event.recordingUrl ?? undefined,
          playbackId: event.playbackId,
          playbackPolicy: event.playbackPolicy,
          recordingReady: true,
          recordingExpiry,
        });
        break;
      }
    }
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
      return {
        valid: true,
        eventId: event.id,
        accessToken: await this.streamAccess.issueToken(event.id),
      };
    }

    const hashedCode = this.hashAccessCode(dto.code);
    if (hashedCode !== event.accessCode) {
      throw new ForbiddenException('Código de acceso incorrecto');
    }

    if ((dto.name || dto.email) && dto.consent === true) {
      await this.repo.createLead({
        name: dto.name ?? 'Anónimo',
        email: dto.email,
        consent: dto.consent ?? false,
        consentVersion: dto.consentVersion,
        consentSource: dto.consentSource,
        source: 'DIRECT',
        tenant: { connect: { id: event.tenantId } },
        event: { connect: { id: event.id } },
      });
    }

    return {
      valid: true,
      eventId: event.id,
      accessToken: await this.streamAccess.issueToken(event.id),
    };
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
   * Hashea un código de acceso usando SHA-256.
   * Los códigos nunca se almacenan en texto plano en la base de datos
   * (RNF-STREAM-007).
   *
   * @param code - Código de acceso en texto plano
   * @returns Hash SHA-256 del código
   */
  private hashAccessCode(code: string): string {
    const secret =
      this.config.get<string>('ACCESS_CODE_HMAC_SECRET') ??
      'zentic-access-code-secret';
    return createHmac('sha256', secret).update(code).digest('hex');
  }

  private async assertViewerAccess(
    event: { id: string; isPublic: boolean },
    accessToken?: string,
  ): Promise<void> {
    if (event.isPublic) return;
    if (!(await this.streamAccess.canAccess(accessToken, event.id))) {
      throw new ForbiddenException('Acceso requerido para este evento');
    }
  }

  private async resolvePlaybackUrl(event: {
    id?: string;
    tenantId?: string;
    isPublic?: boolean;
    provider: string | null;
    playbackId: string | null;
    playbackPolicy: string | null;
    recordingUrl: string | null;
  }): Promise<string | null> {
    if (event.provider === 'mux') {
      if (event.playbackId && event.playbackPolicy) {
        return this.muxProvider.getPlaybackUrl(
          event.playbackId,
          event.playbackPolicy as 'public' | 'signed',
        );
      }
      const legacy = event.recordingUrl?.match(/^mux:(public|signed):(.+)$/);
      if (legacy) {
        return this.muxProvider.getPlaybackUrl(
          legacy[2],
          legacy[1] as 'public' | 'signed',
        );
      }
    }
    if (
      event.provider === 'cloudflare' &&
      event.playbackId &&
      event.playbackPolicy
    ) {
      return this.cloudflareProvider.getPlaybackUrl(
        event.playbackId,
        event.playbackPolicy as 'public' | 'signed',
      );
    }
    if (event.provider === 'cloudflare' && event.isPublic === false) {
      return this.resolveLegacyCloudflarePlayback(event);
    }
    return event.recordingUrl;
  }

  private async resolveLegacyCloudflarePlayback(event: {
    id?: string;
    tenantId?: string;
    recordingUrl: string | null;
  }): Promise<string | null> {
    if (!event.id || !event.tenantId || !event.recordingUrl) return null;

    const playbackId = this.cloudflareProvider.extractPlaybackId(
      event.recordingUrl,
    );
    if (!playbackId) return null;

    await this.cloudflareProvider.enableSignedPlayback(playbackId);
    await this.repo.update(event.tenantId, event.id, {
      playbackId,
      playbackPolicy: 'signed',
    });
    return this.cloudflareProvider.getPlaybackUrl(playbackId, 'signed');
  }

  /**
   * Resuelve el proveedor de streaming para un evento específico (PROV-01).
   * Usa `event.provider` si está definido, o el proveedor por defecto.
   */
  private resolveProvider(event: { provider: string | null }): StreamProvider {
    return resolveProviderForEvent(
      event,
      this.muxProvider,
      this.cloudflareProvider,
      this.provider,
    );
  }

  /**
   * SCHED-06: Ejecuta overlap check + operación en transacción con reintento.
   * Previene creaciones simultáneas que podrían eludir la validación de sala.
   */
  private async withOverlapCheck<T>(
    tenantId: string,
    roomId: string | null | undefined,
    scheduledAt: Date,
    estimatedDuration: number | null | undefined,
    excludeId: string | undefined,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    const duration = estimatedDuration ?? 60;
    const newEnd = new Date(scheduledAt.getTime() + duration * 60000);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            if (roomId) {
              const overlapping =
                await this.repo.findOverlappingByRoomAndTimeRange(
                  tenantId,
                  roomId,
                  scheduledAt,
                  newEnd,
                  excludeId,
                  tx,
                );
              if (overlapping) {
                throw new ConflictException(
                  'La sala está ocupada en ese horario',
                );
              }
            }
            return await operation(tx);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < maxRetries
        ) {
          this.logger.warn(
            `Conflicto de concurrencia (intento ${attempt}/${maxRetries}), reintentando...`,
          );
          continue;
        }
        throw error;
      }
    }
    throw new ServiceUnavailableException(
      'No se pudo completar la operación por congestión',
    );
  }

  private maskSecret(secret: string | null): string | null {
    if (!secret) return null;
    if (secret.length <= 8) return '••••••••';
    return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
  }

  /** Retira credenciales y hashes antes de devolver un evento por endpoints generales. */
  private withoutStreamingSecrets<T extends Record<string, unknown>>(
    event: T,
  ): Omit<
    T,
    | 'streamKey'
    | 'rtmpUrl'
    | 'accessCode'
    | 'providerStreamId'
    | 'playbackId'
    | 'playbackPolicy'
  > & { hasAccessCode: boolean } {
    const {
      streamKey: _streamKey,
      rtmpUrl: _rtmpUrl,
      accessCode: _accessCode,
      providerStreamId: _providerStreamId,
      playbackId: _playbackId,
      playbackPolicy: _playbackPolicy,
      ...safeEvent
    } = event;
    return { ...safeEvent, hasAccessCode: Boolean(_accessCode) };
  }
}
