import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Deceased as DeceasedRecord,
  Event as EventRecord,
  ObituaryMessage as ObituaryMessageRecord,
  ObituaryStatus,
} from '@prisma/client';
// sanitize-html exporta con `export =` (función invocable). Sin esModuleInterop, ni el default
// import (resuelve a `.default`, undefined) ni el namespace import (TS no lo tipa como
// invocable) sirven; esta es la única forma que preserva el tipo invocable real en runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sanitizeHtml = require('sanitize-html');
import {
  Deceased,
  Obituary,
  ObituaryMessage,
  PaginatedResponse,
  PublicObituary,
  PublicObituaryEvent,
} from '@zentic/shared-types';
import { assertTenantContext } from '../../common/security/assert-tenant-context';
import {
  EventSummary,
  ObituaryRepository,
  ObituaryWithDeceased,
} from './obituary.repository';
import { CreateObituaryDto } from './dto/create-obituary.dto';
import { UpdateObituaryDto } from './dto/update-obituary.dto';
import { ListObituariesQueryDto } from './dto/list-obituaries-query.dto';
import { CreateObituaryMessageDto } from './dto/create-obituary-message.dto';
import { generateObituarySlug } from './utils/slug.util';
import { DeceasedPhotoService } from './services/deceased-photo.service';
import { FilesService, UploadableFile } from '../files/files.service';

interface RequiredFieldRule {
  isSatisfied: (deceased: DeceasedRecord) => boolean;
  label: string;
}

const REQUIRED_FIELDS_TO_PUBLISH: RequiredFieldRule[] = [
  { isSatisfied: (d) => d.deathDate !== null, label: 'Fecha de fallecimiento' },
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'strong', 'em', 'br'],
  allowedAttributes: {},
};

@Injectable()
export class ObituaryService {
  constructor(
    private readonly obituaryRepo: ObituaryRepository,
    private readonly deceasedPhotoService: DeceasedPhotoService,
    private readonly filesService: FilesService,
  ) {}

  async findAll(
    tenantId: string,
    query: ListObituariesQueryDto,
  ): Promise<PaginatedResponse<Obituary>> {
    assertTenantContext(tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const { data, total } = await this.obituaryRepo.findMany(tenantId, {
      status: query.status,
      search: query.search,
      page,
      limit,
    });

    return {
      data: data.map((record) => this.toObituary(record)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(tenantId: string, id: string): Promise<Obituary> {
    assertTenantContext(tenantId);
    const existing = await this.obituaryRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Obituario no encontrado');
    return this.toObituary(existing);
  }

  async findPublic(
    tenantId: string,
    slug: string,
    accessCode?: string,
  ): Promise<PublicObituary> {
    assertTenantContext(tenantId);
    const existing = await this.obituaryRepo.findBySlugPublic(tenantId, slug);
    if (!existing) throw new NotFoundException('Obituario no encontrado');

    // RN-OBT: "Visibilidad: Solo con código" protege la página completa, no solo los mensajes.
    const accessGranted =
      existing.isPublic || (!!accessCode && accessCode === existing.accessCode);

    if (!accessGranted) {
      return {
        id: existing.id,
        slug: existing.slug,
        status: existing.status as PublicObituary['status'],
        isPublic: existing.isPublic,
        publishedAt: existing.publishedAt?.toISOString() ?? null,
        accessGranted: false,
        deceased: null,
        event: null,
        streamingAction: null,
        approvedMessages: [],
      };
    }

    const event = existing.eventId
      ? await this.obituaryRepo.findEventById(tenantId, existing.eventId)
      : null;
    const approvedMessages = await this.obituaryRepo.findApprovedMessages(
      tenantId,
      existing.id,
    );

    return {
      id: existing.id,
      slug: existing.slug,
      status: existing.status as PublicObituary['status'],
      isPublic: existing.isPublic,
      publishedAt: existing.publishedAt?.toISOString() ?? null,
      accessGranted: true,
      deceased: this.toDeceased(existing.deceased),
      event: event
        ? {
            slug: event.slug,
            status: event.status as PublicObituaryEvent['status'],
          }
        : null,
      streamingAction: this.resolveStreamingAction(event),
      approvedMessages: approvedMessages.map((m) => this.toObituaryMessage(m)),
    };
  }

  async listAvailableEvents(tenantId: string): Promise<EventSummary[]> {
    assertTenantContext(tenantId);
    return this.obituaryRepo.listEventsForTenant(tenantId);
  }

  async create(tenantId: string, dto: CreateObituaryDto): Promise<Obituary> {
    assertTenantContext(tenantId);
    this.validateDates(dto.birthDate, dto.deathDate);

    if (dto.eventId) {
      await this.assertEventBelongsToTenant(tenantId, dto.eventId);
    }

    const slug = generateObituarySlug(dto.firstName, dto.lastName);
    const created = await this.obituaryRepo.createWithDeceased(
      tenantId,
      slug,
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        deathDate: dto.deathDate ? new Date(dto.deathDate) : undefined,
        birthCity: dto.birthCity,
        deathCity: dto.deathCity,
        biography: dto.biography
          ? sanitizeHtml(dto.biography, SANITIZE_OPTIONS)
          : undefined,
        epitaph: dto.epitaph,
      },
      {
        eventId: dto.eventId,
        isPublic: dto.isPublic,
        accessCode: dto.accessCode,
      },
    );

    return this.toObituary(created);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateObituaryDto,
  ): Promise<Obituary> {
    assertTenantContext(tenantId);
    const existing = await this.obituaryRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Obituario no encontrado');

    const birthDate =
      dto.birthDate ?? existing.deceased.birthDate?.toISOString();
    const deathDate =
      dto.deathDate ?? existing.deceased.deathDate?.toISOString();
    this.validateDates(birthDate, deathDate);

    if (dto.eventId) {
      await this.assertEventBelongsToTenant(tenantId, dto.eventId);
    }

    await this.obituaryRepo.update(
      tenantId,
      id,
      existing.deceasedId,
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        deathDate: dto.deathDate ? new Date(dto.deathDate) : undefined,
        birthCity: dto.birthCity,
        deathCity: dto.deathCity,
        biography:
          dto.biography !== undefined
            ? sanitizeHtml(dto.biography, SANITIZE_OPTIONS)
            : undefined,
        epitaph: dto.epitaph,
      },
      // RN-OBT-004: slug inmutable — nunca se incluye en el payload de actualización.
      {
        eventId: dto.eventId,
        isPublic: dto.isPublic,
        accessCode: dto.accessCode,
      },
    );

    const updated = await this.obituaryRepo.findById(tenantId, id);
    return this.toObituary(updated!);
  }

  async publish(tenantId: string, id: string): Promise<Obituary> {
    assertTenantContext(tenantId);
    const existing = await this.obituaryRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Obituario no encontrado');

    const missingFields = REQUIRED_FIELDS_TO_PUBLISH.filter(
      (rule) => !rule.isSatisfied(existing.deceased),
    ).map((rule) => rule.label);

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Completa los campos requeridos antes de publicar: ${missingFields.join(', ')}`,
      );
    }

    await this.obituaryRepo.updateStatus(
      tenantId,
      id,
      ObituaryStatus.PUBLISHED,
      new Date(),
    );
    const updated = await this.obituaryRepo.findById(tenantId, id);
    return this.toObituary(updated!);
  }

  async unpublish(tenantId: string, id: string): Promise<Obituary> {
    assertTenantContext(tenantId);
    const existing = await this.obituaryRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Obituario no encontrado');

    // RN-OBT-002: despublicar conserva toda la información, solo cambia el estado.
    await this.obituaryRepo.updateStatus(
      tenantId,
      id,
      ObituaryStatus.DRAFT,
      null,
    );
    const updated = await this.obituaryRepo.findById(tenantId, id);
    return this.toObituary(updated!);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    assertTenantContext(tenantId);
    const existing = await this.obituaryRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Obituario no encontrado');

    // RN-OBT-003: soft delete — el obituario y sus mensajes se conservan 180 días.
    await this.obituaryRepo.softDelete(tenantId, id);
  }

  async uploadPhoto(
    tenantId: string,
    id: string,
    file: UploadableFile,
  ): Promise<{ obituary: Obituary; lowResolutionWarning: boolean }> {
    assertTenantContext(tenantId);
    const existing = await this.obituaryRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Obituario no encontrado');

    const { photoUrl, lowResolutionWarning } =
      await this.deceasedPhotoService.process(tenantId, file);

    const previousPhotoUrl = existing.deceased.photoUrl;
    await this.obituaryRepo.updatePhoto(
      tenantId,
      existing.deceasedId,
      photoUrl,
    );
    if (previousPhotoUrl && previousPhotoUrl !== photoUrl) {
      await this.filesService.delete(previousPhotoUrl);
    }

    const updated = await this.obituaryRepo.findById(tenantId, id);
    return { obituary: this.toObituary(updated!), lowResolutionWarning };
  }

  async submitMessage(
    tenantId: string,
    slug: string,
    dto: CreateObituaryMessageDto,
  ): Promise<ObituaryMessage> {
    assertTenantContext(tenantId);
    const obituary = await this.obituaryRepo.findBySlugPublic(tenantId, slug);
    if (!obituary) throw new NotFoundException('Obituario no encontrado');

    if (!obituary.isPublic && dto.accessCode !== obituary.accessCode) {
      throw new ForbiddenException('Código de acceso inválido');
    }

    // El mensaje queda PENDING por default (moderación previa) — ver schema.
    const created = await this.obituaryRepo.createMessage(
      tenantId,
      obituary.id,
      {
        authorName: dto.authorName,
        content: dto.content,
        iconType: dto.iconType,
      },
    );

    return this.toObituaryMessage(created);
  }

  private async assertEventBelongsToTenant(
    tenantId: string,
    eventId: string,
  ): Promise<void> {
    const event = await this.obituaryRepo.findEventById(tenantId, eventId);
    if (!event) throw new NotFoundException('Evento vinculado no encontrado');
  }

  private validateDates(birthDate?: string, deathDate?: string): void {
    if (deathDate) {
      const death = new Date(deathDate);
      if (death.getTime() > Date.now()) {
        throw new BadRequestException(
          'La fecha de fallecimiento no puede ser posterior a la fecha actual',
        );
      }
      if (birthDate && new Date(birthDate).getTime() > death.getTime()) {
        throw new BadRequestException(
          'La fecha de nacimiento no puede ser posterior a la de fallecimiento',
        );
      }
    }
  }

  private resolveStreamingAction(
    event: EventRecord | null,
  ): 'LIVE' | 'RECORDING' | null {
    if (!event) return null;
    if (event.status === 'LIVE') return 'LIVE';
    if (event.status === 'FINISHED' && event.recordingUrl) return 'RECORDING';
    return null;
  }

  private toObituary(record: ObituaryWithDeceased): Obituary {
    return {
      id: record.id,
      tenantId: record.tenantId,
      deceasedId: record.deceasedId,
      eventId: record.eventId,
      slug: record.slug,
      status: record.status as Obituary['status'],
      isPublic: record.isPublic,
      accessCode: record.accessCode,
      publishedAt: record.publishedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      deceased: this.toDeceased(record.deceased),
    };
  }

  private toDeceased(record: DeceasedRecord): Deceased {
    return {
      id: record.id,
      tenantId: record.tenantId,
      firstName: record.firstName,
      lastName: record.lastName,
      birthDate: record.birthDate?.toISOString() ?? null,
      deathDate: record.deathDate?.toISOString() ?? null,
      birthCity: record.birthCity,
      deathCity: record.deathCity,
      biography: record.biography,
      epitaph: record.epitaph,
      photoUrl: record.photoUrl,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toObituaryMessage(record: ObituaryMessageRecord): ObituaryMessage {
    return {
      id: record.id,
      obituaryId: record.obituaryId,
      authorName: record.authorName,
      content: record.content,
      iconType: record.iconType,
      status: record.status as ObituaryMessage['status'],
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
