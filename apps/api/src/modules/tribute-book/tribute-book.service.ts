import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Message,
  MessageStatus,
  ObituaryMessage,
  TributeBookGeneration,
  TributeBookStatus,
} from '@prisma/client';
import {
  MessageOrigin,
  PaginatedResponse,
  TributeBookGeneration as TributeBookGenerationDto,
  TributeMessage,
} from '@zentic/shared-types';
import { assertTenantContext } from '../../common/security/assert-tenant-context';
import { TributeBookRepository } from './tribute-book.repository';
import { PdfFactory } from './factories/pdf.factory';
import { TributeBookMessage } from './generators/tribute-book-pdf.generator';
import { FilesService } from '../files/files.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { ListTributeMessagesQueryDto } from './dto/list-tribute-messages-query.dto';
import { BulkApproveMessagesDto } from './dto/bulk-approve-messages.dto';
import { GenerateTributeBookDto } from './dto/generate-tribute-book.dto';

const RESTORE_WINDOW_DAYS = 30;
const DOWNLOAD_LINK_TTL_HOURS = 72;

interface GenerationTarget {
  deceased: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    deathDate: Date | null;
    epitaph: string | null;
    photoUrl: string | null;
  };
  messages: TributeBookMessage[];
}

@Injectable()
export class TributeBookService {
  private readonly logger = new Logger(TributeBookService.name);

  constructor(
    private readonly repo: TributeBookRepository,
    private readonly pdfFactory: PdfFactory,
    private readonly filesService: FilesService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async listMessages(
    tenantId: string,
    query: ListTributeMessagesQueryDto,
  ): Promise<PaginatedResponse<TributeMessage>> {
    assertTenantContext(tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const filters = {
      status: query.status,
      eventId: query.eventId,
      obituaryId: query.obituaryId,
      search: query.search,
      trashed: query.trashed,
    };

    const [streaming, obituary] = await Promise.all([
      this.shouldQueryStreaming(query)
        ? this.repo.findStreamingMessages(tenantId, filters)
        : Promise.resolve([]),
      this.shouldQueryObituary(query)
        ? this.repo.findObituaryMessages(tenantId, filters)
        : Promise.resolve([]),
    ]);

    const merged: TributeMessage[] = [
      ...streaming.map((m) => this.toTributeMessage(m, 'STREAMING')),
      ...obituary.map((m) => this.toTributeMessage(m, 'OBITUARY')),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const total = merged.length;
    const start = (page - 1) * limit;

    return {
      data: merged.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  pendingCount(tenantId: string): Promise<number> {
    assertTenantContext(tenantId);
    return this.repo.countPending(tenantId);
  }

  async approveMessage(
    tenantId: string,
    id: string,
    origin: MessageOrigin,
    actorId: string,
  ): Promise<TributeMessage> {
    assertTenantContext(tenantId);
    const message = await this.setStatus(
      tenantId,
      id,
      origin,
      MessageStatus.APPROVED,
      actorId,
    );
    this.broadcastApproval(tenantId, message);
    return message;
  }

  async rejectMessage(
    tenantId: string,
    id: string,
    origin: MessageOrigin,
    actorId: string,
    rejectedReason?: string,
  ): Promise<TributeMessage> {
    assertTenantContext(tenantId);
    return this.setStatus(
      tenantId,
      id,
      origin,
      MessageStatus.REJECTED,
      actorId,
      rejectedReason,
    );
  }

  async bulkApprove(
    tenantId: string,
    dto: BulkApproveMessagesDto,
    actorId: string,
  ): Promise<{ approved: number }> {
    assertTenantContext(tenantId);
    const streamingIds = dto.items
      .filter((item) => item.origin === 'STREAMING')
      .map((item) => item.id);
    const obituaryIds = dto.items
      .filter((item) => item.origin === 'OBITUARY')
      .map((item) => item.id);

    await this.repo.bulkApprove(tenantId, streamingIds, obituaryIds, actorId);

    // Cada mensaje transmite a su propia sala (evento u obituario) — no hay un broadcast masivo.
    for (const item of dto.items) {
      const record =
        item.origin === 'STREAMING'
          ? await this.repo.findStreamingMessageById(tenantId, item.id)
          : await this.repo.findObituaryMessageById(tenantId, item.id);
      if (record) {
        this.broadcastApproval(
          tenantId,
          this.toTributeMessage(record, item.origin),
        );
      }
    }

    return { approved: dto.items.length };
  }

  async softDelete(
    tenantId: string,
    id: string,
    origin: MessageOrigin,
  ): Promise<void> {
    assertTenantContext(tenantId);
    if (origin === 'STREAMING') {
      await this.repo.softDeleteStreamingMessage(tenantId, id);
    } else {
      await this.repo.softDeleteObituaryMessage(tenantId, id);
    }
  }

  async restore(
    tenantId: string,
    id: string,
    origin: MessageOrigin,
  ): Promise<void> {
    assertTenantContext(tenantId);
    const record =
      origin === 'STREAMING'
        ? await this.repo.findStreamingMessageById(tenantId, id)
        : await this.repo.findObituaryMessageById(tenantId, id);
    if (!record) throw new NotFoundException('Mensaje no encontrado');
    if (!record.deletedAt) {
      throw new BadRequestException('El mensaje no está en la papelera');
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RESTORE_WINDOW_DAYS);
    if (record.deletedAt < cutoff) {
      throw new ConflictException(
        'El mensaje superó la ventana de restauración de 30 días (RN-TRIB-003)',
      );
    }

    if (origin === 'STREAMING') {
      await this.repo.restoreStreamingMessage(tenantId, id);
    } else {
      await this.repo.restoreObituaryMessage(tenantId, id);
    }
  }

  async generate(
    tenantId: string,
    dto: GenerateTributeBookDto,
    actorId: string,
  ): Promise<TributeBookGenerationDto> {
    assertTenantContext(tenantId);
    if ((!dto.eventId && !dto.obituaryId) || (dto.eventId && dto.obituaryId)) {
      throw new BadRequestException(
        'Debes indicar exactamente uno: eventId u obituaryId',
      );
    }

    const includeStreaming = dto.includeStreamingMessages ?? true;
    const includeObituary = dto.includeObituaryMessages ?? true;
    const target = await this.resolveGenerationTarget(
      tenantId,
      dto,
      includeStreaming,
      includeObituary,
    );

    if (target.messages.length === 0) {
      // RN-TRIB-004: el libro solo puede generarse si hay al menos 1 mensaje aprobado.
      throw new BadRequestException(
        'No hay mensajes aprobados para generar el libro',
      );
    }

    const generation = await this.repo.createGeneration({
      tenantId,
      eventId: dto.eventId,
      obituaryId: dto.obituaryId,
      generatedBy: actorId,
      messageCount: target.messages.length,
    });

    // Recomendación #5 del spec: generar siempre en asíncrono, incluso cuando es rápido.
    void this.runGeneration(generation.id, tenantId, target).catch((error) => {
      this.logger.error(
        `Error inesperado generando el libro de homenajes ${generation.id}`,
        error as Error,
      );
    });

    return this.toGenerationDto(generation);
  }

  async getHistory(
    tenantId: string,
    page = 1,
    limit = 25,
  ): Promise<PaginatedResponse<TributeBookGenerationDto>> {
    assertTenantContext(tenantId);
    const { data, total } = await this.repo.listGenerations(
      tenantId,
      page,
      limit,
    );
    return {
      data: data.map((g) => this.toGenerationDto(g)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async download(
    tenantId: string,
    generationId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    assertTenantContext(tenantId);
    const generation = await this.repo.findGenerationById(
      tenantId,
      generationId,
    );
    if (!generation) throw new NotFoundException('Generación no encontrada');

    if (generation.status === TributeBookStatus.PROCESSING) {
      throw new BadRequestException('El libro todavía se está generando');
    }
    if (generation.status === TributeBookStatus.ERROR) {
      throw new BadRequestException(
        generation.errorMessage ?? 'La generación del libro falló',
      );
    }
    if (
      !generation.pdfUrl ||
      !generation.expiresAt ||
      generation.expiresAt < new Date()
    ) {
      throw new GoneException(
        'El enlace de descarga expiró; genera el libro nuevamente',
      );
    }

    const buffer = await this.filesService.readPrivateFile(generation.pdfUrl);
    if (!buffer) {
      throw new NotFoundException('El archivo generado ya no está disponible');
    }

    return { buffer, filename: `libro-homenajes-${generation.id}.pdf` };
  }

  // ── privado ──────────────────────────────────────────────────────────

  private shouldQueryStreaming(query: ListTributeMessagesQueryDto): boolean {
    if (query.origin === 'OBITUARY') return false;
    if (query.obituaryId) return false; // no aplica a Message
    return true;
  }

  private shouldQueryObituary(query: ListTributeMessagesQueryDto): boolean {
    if (query.origin === 'STREAMING') return false;
    if (query.eventId) return false; // no aplica a ObituaryMessage
    return true;
  }

  private async setStatus(
    tenantId: string,
    id: string,
    origin: MessageOrigin,
    status: MessageStatus,
    actorId: string,
    rejectedReason?: string,
  ): Promise<TributeMessage> {
    const existing =
      origin === 'STREAMING'
        ? await this.repo.findStreamingMessageById(tenantId, id)
        : await this.repo.findObituaryMessageById(tenantId, id);
    if (!existing) throw new NotFoundException('Mensaje no encontrado');

    const updated =
      origin === 'STREAMING'
        ? await this.repo.setStreamingMessageStatus(
            tenantId,
            id,
            status,
            actorId,
            rejectedReason,
          )
        : await this.repo.setObituaryMessageStatus(
            tenantId,
            id,
            status,
            actorId,
            rejectedReason,
          );

    return this.toTributeMessage(updated, origin);
  }

  private broadcastApproval(tenantId: string, message: TributeMessage): void {
    if (message.status !== 'APPROVED') return;

    const payloadMessage = {
      id: message.id,
      authorName: message.authorName,
      content: message.content,
      iconType: message.iconType,
      createdAt: message.createdAt,
    };

    if (message.origin === 'STREAMING' && message.eventId) {
      this.gateway.broadcastNewMessage(message.eventId, {
        eventId: message.eventId,
        tenantId,
        message: payloadMessage,
      });
    } else if (message.origin === 'OBITUARY' && message.obituaryId) {
      this.gateway.broadcastObituaryMessage(message.obituaryId, {
        obituaryId: message.obituaryId,
        tenantId,
        message: payloadMessage,
      });
    }
  }

  private async resolveGenerationTarget(
    tenantId: string,
    dto: GenerateTributeBookDto,
    includeStreaming: boolean,
    includeObituary: boolean,
  ): Promise<GenerationTarget> {
    let eventId = dto.eventId;
    let obituaryId = dto.obituaryId;
    let deceased: GenerationTarget['deceased'];

    if (eventId) {
      const event = await this.repo.findEventWithDeceased(tenantId, eventId);
      if (!event) throw new NotFoundException('Evento no encontrado');
      deceased = event.deceased;

      if (includeObituary && !obituaryId) {
        const linkedObituary = await this.repo.findObituaryByEventId(
          tenantId,
          eventId,
        );
        if (linkedObituary) obituaryId = linkedObituary.id;
      }
    } else {
      const obituary = await this.repo.findObituaryWithDeceased(
        tenantId,
        obituaryId!,
      );
      if (!obituary) throw new NotFoundException('Obituario no encontrado');
      deceased = obituary.deceased;

      if (includeStreaming && obituary.eventId) {
        eventId = obituary.eventId;
      }
    }

    const [streamingMessages, obituaryMessages] = await Promise.all([
      includeStreaming && eventId
        ? this.repo.findApprovedStreamingMessages(eventId)
        : Promise.resolve([] as Message[]),
      includeObituary && obituaryId
        ? this.repo.findApprovedObituaryMessages(obituaryId)
        : Promise.resolve([] as ObituaryMessage[]),
    ]);

    const messages: TributeBookMessage[] = [
      ...streamingMessages.map((m) => this.toBookMessage(m)),
      ...obituaryMessages.map((m) => this.toBookMessage(m)),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return { deceased, messages };
  }

  private toBookMessage(record: Message | ObituaryMessage): TributeBookMessage {
    return {
      authorName: record.authorName,
      content: record.content,
      iconType: record.iconType,
      createdAt: record.createdAt,
    };
  }

  private async runGeneration(
    generationId: string,
    tenantId: string,
    target: GenerationTarget,
  ): Promise<void> {
    try {
      const brand = await this.repo.findTenantBrand(tenantId);
      const buffer = await this.pdfFactory.create('TRIBUTE_BOOK').generate({
        deceased: target.deceased,
        tenantName: brand?.name ?? '',
        tenantLogoUrl: brand?.logoUrl ?? null,
        messages: target.messages,
      });

      const pdfUrl = await this.filesService.savePrivateFile(
        buffer,
        'tribute-books',
        'pdf',
      );
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + DOWNLOAD_LINK_TTL_HOURS);

      await this.repo.updateGenerationStatus(generationId, {
        status: TributeBookStatus.READY,
        pdfUrl,
        expiresAt,
      });
    } catch (error) {
      this.logger.error(
        `Fallo al generar el libro de homenajes ${generationId}`,
        error as Error,
      );
      await this.repo.updateGenerationStatus(generationId, {
        status: TributeBookStatus.ERROR,
        errorMessage: this.sanitizeError(error),
      });
    }
  }

  private sanitizeError(error: unknown): string {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return message.slice(0, 300);
  }

  private toTributeMessage(
    record: Message | ObituaryMessage,
    origin: MessageOrigin,
  ): TributeMessage {
    const isStreaming = origin === 'STREAMING';
    return {
      id: record.id,
      origin,
      tenantId: record.tenantId,
      eventId: isStreaming ? (record as Message).eventId : null,
      obituaryId: isStreaming ? null : (record as ObituaryMessage).obituaryId,
      authorName: record.authorName,
      content: record.content,
      iconType: record.iconType,
      status: record.status as TributeMessage['status'],
      rejectedReason: record.rejectedReason,
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      deletedAt: record.deletedAt?.toISOString() ?? null,
    };
  }

  private toGenerationDto(
    record: TributeBookGeneration,
  ): TributeBookGenerationDto {
    return {
      id: record.id,
      tenantId: record.tenantId,
      eventId: record.eventId,
      obituaryId: record.obituaryId,
      generatedBy: record.generatedBy,
      status: record.status as TributeBookGenerationDto['status'],
      // La ruta interna en private-storage nunca se expone; la descarga va por
      // GET /api/tribute-book/:id/download, que valida permiso y expiración.
      pdfUrl: null,
      errorMessage: record.errorMessage,
      expiresAt: record.expiresAt?.toISOString() ?? null,
      messageCount: record.messageCount,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
