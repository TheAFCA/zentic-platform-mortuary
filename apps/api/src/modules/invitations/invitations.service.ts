import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Invitation as InvitationRecord } from '@prisma/client';
import {
  Invitation,
  InvitationTemplate,
  PaginatedResponse,
  PublicInvitation,
  PublicInvitationEvent,
} from '@zentic/shared-types';
import { assertTenantContext } from '../../common/security/assert-tenant-context';
import { generateSlug } from '../../common/utils/slug.util';
import { FilesService } from '../files/files.service';
import {
  EventForInvitation,
  InvitationsRepository,
} from './invitations.repository';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { ListInvitationsQueryDto } from './dto/list-invitations-query.dto';
import { InvitationImageService } from './services/invitation-image.service';
import { InvitationRenderContext } from './renderers/invitation-template-renderer.interface';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly invitationsRepo: InvitationsRepository,
    private readonly invitationImageService: InvitationImageService,
    private readonly filesService: FilesService,
  ) {}

  async findAll(
    tenantId: string,
    query: ListInvitationsQueryDto,
  ): Promise<PaginatedResponse<Invitation>> {
    assertTenantContext(tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const { data, total } = await this.invitationsRepo.findMany(tenantId, {
      status: query.status,
      eventId: query.eventId,
      page,
      limit,
    });

    return {
      data: data.map((record) => this.toInvitation(record)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(tenantId: string, id: string): Promise<Invitation> {
    assertTenantContext(tenantId);
    const existing = await this.invitationsRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Invitación no encontrada');
    return this.toInvitation(existing);
  }

  async create(
    tenantId: string,
    dto: CreateInvitationDto,
    createdBy: string,
  ): Promise<Invitation> {
    assertTenantContext(tenantId);
    const event = await this.invitationsRepo.findEventForInvitation(
      tenantId,
      dto.eventId,
    );
    if (!event) throw new NotFoundException('Evento no encontrado');

    const created = await this.invitationsRepo.create(tenantId, createdBy, {
      eventId: dto.eventId,
      template: dto.template,
      message: dto.message,
      accessCodeDisplay: dto.accessCodeDisplay,
    });
    return this.toInvitation(created);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateInvitationDto,
  ): Promise<Invitation> {
    assertTenantContext(tenantId);
    const existing = await this.invitationsRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Invitación no encontrada');
    // Una invitación archivada es un registro histórico ligado a un evento ya
    // cancelado/eliminado — no debe poder editarse.
    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException(
        'No se puede editar una invitación archivada',
      );
    }

    await this.invitationsRepo.update(tenantId, id, {
      template: dto.template,
      message: dto.message,
      accessCodeDisplay: dto.accessCodeDisplay,
    });
    const updated = await this.invitationsRepo.findById(tenantId, id);
    return this.toInvitation(updated!);
  }

  async publish(tenantId: string, id: string): Promise<Invitation> {
    assertTenantContext(tenantId);
    const existing = await this.invitationsRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Invitación no encontrada');
    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException(
        'No se puede publicar una invitación archivada',
      );
    }
    if (existing.status === 'PUBLISHED') {
      // Idempotente: ya está publicada, no se regenera el enlace.
      return this.toInvitation(existing);
    }

    const event = await this.invitationsRepo.findEventForInvitation(
      tenantId,
      existing.eventId,
    );
    if (!event) {
      throw new NotFoundException('El evento vinculado ya no está disponible');
    }

    // RN-INV-001: Event.deceased y Event.scheduledAt son NOT NULL, así que la única condición
    // realmente opcional es el lugar. Exigimos una sala asignada; la dirección puede faltar y
    // cae al fallback "Dirección por confirmar" sin bloquear la publicación.
    if (!event.room) {
      throw new BadRequestException(
        'El evento debe tener una sala/lugar asignado antes de publicar la invitación',
      );
    }

    const publicUrl = generateSlug(
      `invitacion-${event.deceased.firstName}-${event.deceased.lastName}`,
    );
    await this.invitationsRepo.updateStatus(
      tenantId,
      id,
      'PUBLISHED',
      new Date(),
      publicUrl,
    );
    const updated = await this.invitationsRepo.findById(tenantId, id);
    return this.toInvitation(updated!);
  }

  /** RN-INV-002: invocado por StreamingService al cancelar/eliminar un evento. */
  async archiveByEventId(tenantId: string, eventId: string): Promise<void> {
    assertTenantContext(tenantId);
    await this.invitationsRepo.archiveByEventId(tenantId, eventId);
  }

  async findPublic(
    tenantId: string,
    publicUrl: string,
  ): Promise<PublicInvitation> {
    assertTenantContext(tenantId);
    const existing = await this.invitationsRepo.findByPublicUrl(
      tenantId,
      publicUrl,
    );
    if (!existing) throw new NotFoundException('Invitación no encontrada');

    // Lectura inclusiva: el evento puede estar cancelado/eliminado (RN-INV-002/003) y la
    // invitación debe seguir resolviendo, mostrando el banner de evento cancelado.
    const event = await this.invitationsRepo.findEventForInvitationRender(
      tenantId,
      existing.eventId,
    );
    if (!event) throw new NotFoundException('Invitación no encontrada');

    return this.toPublicInvitation(existing, event, publicUrl);
  }

  async generateImage(
    tenantId: string,
    id: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    assertTenantContext(tenantId);
    const existing = await this.invitationsRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Invitación no encontrada');

    const event = await this.invitationsRepo.findEventForInvitationRender(
      tenantId,
      existing.eventId,
    );
    if (!event) {
      throw new NotFoundException('El evento vinculado ya no está disponible');
    }

    const context = await this.buildRenderContext(existing, event);
    const template = existing.template as InvitationTemplate;

    // Caso borde §13: la generación/subida del preview de chat (og:image) es best-effort y
    // nunca debe bloquear la descarga de la imagen social — solo se registra el fallo.
    try {
      await this.generateAndPersistChatPreview(tenantId, id, template, context);
    } catch (error) {
      this.logger.warn(
        `No se pudo generar/subir el preview de chat de la invitación ${id}: ${error}`,
      );
    }

    let socialBuffer: Buffer;
    try {
      socialBuffer = await this.invitationImageService.renderSocial(
        template,
        context,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo generar la imagen social de la invitación ${id}: ${error}`,
      );
      throw new BadRequestException(
        'No se pudo generar la imagen de la invitación. Intenta nuevamente en unos minutos.',
      );
    }

    const nameSlug = `${event.deceased.firstName}-${event.deceased.lastName}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const year = event.scheduledAt.getFullYear();

    return {
      buffer: socialBuffer,
      filename: `invitacion-${nameSlug}-${year}.png`,
    };
  }

  private async generateAndPersistChatPreview(
    tenantId: string,
    id: string,
    template: InvitationTemplate,
    context: InvitationRenderContext,
  ): Promise<void> {
    const chatBuffer = await this.invitationImageService.renderChatPreview(
      template,
      context,
    );
    const imageUrl = await this.filesService.upload(
      {
        buffer: chatBuffer,
        mimetype: 'image/png',
        originalname: 'invitation-chat.png',
      },
      `invitations/${tenantId}`,
      { maxSizeBytes: 3_000_000 },
    );
    await this.invitationsRepo.updateImageUrl(tenantId, id, imageUrl);
  }

  private async buildRenderContext(
    invitation: InvitationRecord,
    event: EventForInvitation,
  ): Promise<InvitationRenderContext> {
    const [deceasedPhotoDataUri, tenantLogoDataUri] = await Promise.all([
      this.invitationImageService.toDataUri(event.deceased.photoUrl),
      this.invitationImageService.toDataUri(
        event.tenant.brandConfig?.logoUrl ?? null,
      ),
    ]);

    return {
      deceasedFullName: `${event.deceased.firstName} ${event.deceased.lastName}`,
      deceasedPhotoDataUri,
      message: invitation.message,
      scheduledAt: event.scheduledAt,
      ceremonyType: event.ceremonyType,
      place: event.room
        ? {
            venueName: event.room.venue.name,
            roomName: event.room.name,
            address: event.room.venue.address,
          }
        : null,
      accessCodeDisplay: invitation.accessCodeDisplay,
      tenantName: event.tenant.name,
      tenantLogoDataUri,
      brand: {
        primaryColor: event.tenant.brandConfig?.primaryColor ?? '#1a1a2e',
        secondaryColor: event.tenant.brandConfig?.secondaryColor ?? '#16213e',
        textColor: event.tenant.brandConfig?.textColor ?? '#333333',
        backgroundColor: event.tenant.brandConfig?.backgroundColor ?? '#f5f5f5',
      },
    };
  }

  private toInvitation(record: InvitationRecord): Invitation {
    return {
      id: record.id,
      tenantId: record.tenantId,
      eventId: record.eventId,
      template: record.template as Invitation['template'],
      status: record.status as Invitation['status'],
      message: record.message,
      publicUrl: record.publicUrl,
      imageUrl: record.imageUrl,
      accessCodeDisplay: record.accessCodeDisplay,
      publishedAt: record.publishedAt?.toISOString() ?? null,
      createdBy: record.createdBy,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toPublicInvitation(
    record: InvitationRecord,
    event: EventForInvitation,
    publicUrl: string,
  ): PublicInvitation {
    // RN-INV-004: el código solo se muestra si el evento tiene uno habilitado.
    const hasAccessCode = event.accessCode !== null;

    return {
      publicUrl,
      status: record.status as PublicInvitation['status'],
      template: record.template as PublicInvitation['template'],
      message: record.message,
      imageUrl: record.imageUrl,
      accessCodeDisplay: hasAccessCode ? record.accessCodeDisplay : null,
      publishedAt: record.publishedAt?.toISOString() ?? null,
      deceased: {
        firstName: event.deceased.firstName,
        lastName: event.deceased.lastName,
        photoUrl: event.deceased.photoUrl,
      },
      event: {
        slug: event.slug,
        title: event.title,
        status: event.status as PublicInvitationEvent['status'],
        scheduledAt: event.scheduledAt.toISOString(),
        ceremonyType: event.ceremonyType,
        hasAccessCode,
        place: event.room
          ? {
              venueName: event.room.venue.name,
              roomName: event.room.name,
              address: event.room.venue.address,
            }
          : null,
      },
      tenant: {
        name: event.tenant.name,
        brandConfig: event.tenant.brandConfig
          ? {
              logoUrl: event.tenant.brandConfig.logoUrl,
              faviconUrl: event.tenant.brandConfig.faviconUrl,
              primaryColor: event.tenant.brandConfig.primaryColor,
              secondaryColor: event.tenant.brandConfig.secondaryColor,
              textColor: event.tenant.brandConfig.textColor,
              backgroundColor: event.tenant.brandConfig.backgroundColor,
            }
          : null,
      },
    };
  }
}
