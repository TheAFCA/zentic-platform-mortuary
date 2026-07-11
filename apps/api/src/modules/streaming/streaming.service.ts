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
import { CreateEventDto, UpdateEventDto, SendMessageDto, SendReactionDto, AccessCodeDto } from './dto';
import { EventStatus, MessageStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { Env } from '../../config/env.validation';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly reactionCooldowns = new Map<string, number>();

  constructor(
    private readonly repo: StreamingRepository,
    private readonly gateway: NotificationsGateway,
    private readonly config: ConfigService<Env>,
  ) {}

  // ── CRUD Events ────────────────────────────────────────────────────

  async findAll(tenantId: string) {
    return this.repo.findManyByTenant(tenantId);
  }

  async findOne(tenantId: string, id: string) {
    const event = await this.repo.findById(tenantId, id);
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  async findPublic(slug: string) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt) throw new NotFoundException('Evento no encontrado');

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

  async create(tenantId: string, dto: CreateEventDto) {
    let deceasedId = dto.deceasedId;

    if (!deceasedId && dto.deceased) {
      const deceased = await this.repo.createDeceased({
        tenantId,
        firstName: dto.deceased.firstName,
        lastName: dto.deceased.lastName,
        birthDate: dto.deceased.birthDate ? new Date(dto.deceased.birthDate) : undefined,
        deathDate: dto.deceased.deathDate ? new Date(dto.deceased.deathDate) : undefined,
        photoUrl: dto.deceased.photoUrl,
        biography: dto.deceased.biography,
        epitaph: dto.deceased.epitaph,
      });
      deceasedId = deceased.id;
    }

    if (!deceasedId) {
      throw new BadRequestException('Se requiere un difunto asociado (deceasedId o deceased)');
    }

    if (!dto.deceasedId) {
      const existingDeceased = await this.repo.findDeceasedByTenant(tenantId, deceasedId);
      if (!existingDeceased) throw new BadRequestException('Difunto no encontrado');
    }

    // Verify room availability
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

    const slug = this.generateSlug(dto.title, tenantId);
    const streamKey = this.generateStreamKey();
    const rtmpUrl = this.getRtmpUrl();
    const publicUrl = slug;

    const eventData: Prisma.EventCreateInput = {
      title: dto.title,
      slug,
      streamKey,
      rtmpUrl,
      ceremonyType: dto.ceremonyType,
      description: dto.description,
      estimatedDuration: dto.estimatedDuration,
      isPublic: dto.isPublic ?? true,
      accessCode: dto.accessCode ? this.hashAccessCode(dto.accessCode) : undefined,
      moderationMode: dto.moderationMode as any ?? 'AUTO',
      scheduledAt: new Date(dto.scheduledAt),
      tenant: { connect: { id: tenantId } },
      deceased: { connect: { id: deceasedId } },
      ...(dto.roomId ? { room: { connect: { id: dto.roomId } } } : {}),
      ...(dto.clientId ? { client: { connect: { id: dto.clientId } } } : {}),
    };

    return this.repo.create(eventData);
  }

  async update(tenantId: string, id: string, dto: UpdateEventDto) {
    const event = await this.findOne(tenantId, id);
    if (event.status === 'LIVE' || event.status === 'FINISHED') {
      throw new BadRequestException('No se puede modificar un evento en curso o finalizado');
    }

    const updateData: Prisma.EventUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.ceremonyType !== undefined) updateData.ceremonyType = dto.ceremonyType;
    if (dto.estimatedDuration !== undefined) updateData.estimatedDuration = dto.estimatedDuration;
    if (dto.isPublic !== undefined) updateData.isPublic = dto.isPublic;
    if (dto.moderationMode !== undefined) updateData.moderationMode = dto.moderationMode as any;
    if (dto.scheduledAt !== undefined) updateData.scheduledAt = new Date(dto.scheduledAt);
    if (dto.roomId !== undefined) {
      updateData.room = dto.roomId ? { connect: { id: dto.roomId } } : { disconnect: true };
    }
    if (dto.clientId !== undefined) {
      updateData.clientId = dto.clientId || null;
    }
    if (dto.accessCode !== undefined) {
      updateData.accessCode = dto.accessCode ? this.hashAccessCode(dto.accessCode) : null;
    }
    if (dto.deceasedId !== undefined) {
      updateData.deceased = { connect: { id: dto.deceasedId } };
    }

    return this.repo.update(tenantId, id, updateData);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.repo.softDelete(tenantId, id);
  }

  // ── Stream lifecycle ────────────────────────────────────────────────

  async startStream(tenantId: string, id: string) {
    const event = await this.findOne(tenantId, id);

    if (event.status !== 'SCHEDULED') {
      throw new BadRequestException(`El evento está en estado "${event.status}", no se puede iniciar`);
    }

    const updated = await this.repo.update(tenantId, id, {
      status: 'LIVE' as EventStatus,
      startedAt: new Date(),
    });

    this.gateway.broadcastStreamStatus(id, {
      eventId: id,
      tenantId,
      status: 'LIVE' as any,
    });

    this.logger.log(`Stream started: ${id}`);
    return updated;
  }

  async stopStream(tenantId: string, id: string) {
    const event = await this.findOne(tenantId, id);

    if (event.status !== 'LIVE' && event.status !== 'PAUSED') {
      throw new BadRequestException(`El evento está en estado "${event.status}", no se puede finalizar`);
    }

    const updated = await this.repo.update(tenantId, id, {
      status: 'FINISHED' as EventStatus,
      finishedAt: new Date(),
    });

    this.gateway.broadcastStreamStatus(id, {
      eventId: id,
      tenantId,
      status: 'FINISHED' as any,
    });

    this.logger.log(`Stream finished: ${id}`);
    return updated;
  }

  // ── Messages ────────────────────────────────────────────────────────

  async getMessages(tenantId: string, eventId: string) {
    await this.findOne(tenantId, eventId);
    return this.repo.findMessagesByEvent(tenantId, eventId);
  }

  async getPendingMessages(tenantId: string, eventId: string) {
    await this.findOne(tenantId, eventId);
    return this.repo.findMessagesPendingModeration(tenantId, eventId);
  }

  async sendMessage(slug: string, dto: SendMessageDto) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt) throw new NotFoundException('Evento no encontrado');

    if (event.status === 'SCHEDULED') {
      // Allow pre-messages only if scheduled
    }

    const message = await this.repo.createMessage({
      authorName: dto.authorName,
      content: dto.content,
      iconType: dto.iconType,
      status: event.moderationMode === 'MANUAL' ? 'PENDING' as MessageStatus : 'APPROVED' as MessageStatus,
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

  async approveMessage(tenantId: string, eventId: string, messageId: string) {
    await this.findOne(tenantId, eventId);
    const message = await this.repo.approveMessage(eventId, messageId, tenantId);

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

  async rejectMessage(tenantId: string, eventId: string, messageId: string, reason?: string) {
    await this.findOne(tenantId, eventId);
    return this.repo.rejectMessage(eventId, messageId, reason);
  }

  async deleteMessage(tenantId: string, eventId: string, messageId: string) {
    await this.findOne(tenantId, eventId);
    return this.repo.softDeleteMessage(eventId, messageId);
  }

  // ── Reactions ──────────────────────────────────────────────────────

  async sendReaction(slug: string, dto: SendReactionDto, clientIp?: string) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt) throw new NotFoundException('Evento no encontrado');

    if (event.status !== 'LIVE') {
      // Still allow reactions even after live
    }

    // Rate limiting per IP
    if (clientIp) {
      const now = Date.now();
      const lastReaction = this.reactionCooldowns.get(clientIp) ?? 0;
      if (now - lastReaction < 2000) {
        throw new BadRequestException('Espera un momento antes de enviar otra reacción');
      }
      this.reactionCooldowns.set(clientIp, now);

      // Cleanup old entries
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

  async validateAccessCode(slug: string, dto: AccessCodeDto) {
    const event = await this.repo.findBySlug(slug);
    if (!event || event.deletedAt) throw new NotFoundException('Evento no encontrado');

    if (event.isPublic && !event.accessCode) {
      return { valid: true, eventId: event.id };
    }

    const hashedCode = this.hashAccessCode(dto.code);
    if (hashedCode !== event.accessCode) {
      throw new ForbiddenException('Código de acceso incorrecto');
    }

    // Register lead if info provided
    if (dto.name || dto.email) {
      await this.repo.createLead({
        name: dto.name ?? 'Anónimo',
        email: dto.email,
        consent: dto.consent ?? false,
        source: 'DIRECT' as any,
        tenant: { connect: { id: event.tenantId } },
        event: { connect: { id: event.id } },
      });
    }

    return { valid: true, eventId: event.id };
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private generateSlug(title: string, _tenantId: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    const suffix = randomBytes(4).toString('hex');
    return `${base}-${suffix}`;
  }

  private generateStreamKey(): string {
    return `zentic_${randomBytes(24).toString('hex')}`;
  }

  private getRtmpUrl(): string {
    const provider = this.config.get('STREAM_PROVIDER');
    if (provider === 'mux') {
      return 'rtmps://global-live.mux.com:443/app';
    }
    return 'rtmp://example.com/live';
  }

  private hashAccessCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
