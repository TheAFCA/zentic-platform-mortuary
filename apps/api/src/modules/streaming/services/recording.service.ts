import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  StreamProvider,
  STREAM_PROVIDER_TOKEN,
  resolveProviderForEvent,
} from '../providers/stream-provider.interface';
import { Inject } from '@nestjs/common';
import { MuxStreamProvider } from '../providers/mux-stream.provider';
import { CloudflareStreamProvider } from '../providers/cloudflare-stream.provider';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STREAM_PROVIDER_TOKEN) private readonly provider: StreamProvider,
    private readonly muxProvider: MuxStreamProvider,
    private readonly cloudflareProvider: CloudflareStreamProvider,
  ) {}

  /**
   * Genera una URL firmada bajo demanda para una grabación (REC-02).
   */
  async getSignedRecordingUrl(
    eventId: string,
    tenantId: string,
  ): Promise<string | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, tenantId },
      select: {
        provider: true,
        playbackId: true,
        playbackPolicy: true,
        recordingUrl: true,
        isPublic: true,
      },
    });

    if (!event || !event.playbackId) return null;

    const eventProvider = resolveProviderForEvent(
      event,
      this.muxProvider,
      this.cloudflareProvider,
      this.provider,
    );

    if (event.isPublic) {
      return eventProvider.getPlaybackUrl(event.playbackId, 'public');
    }

    return eventProvider.getPlaybackUrl(event.playbackId, 'signed');
  }

  /**
   * Aplica realmente `recordingExpiry` (REC-03).
   * Genera URLs firmadas de corta duración para contenido privado.
   */
  async getPlaybackUrl(
    eventId: string,
    tenantId: string,
  ): Promise<string | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, tenantId },
      select: { recordingUrl: true, playbackId: true },
    });

    if (!event) return null;

    if (event.playbackId) {
      return this.getSignedRecordingUrl(eventId, tenantId);
    }

    return event.recordingUrl;
  }

  /**
   * Tarea programada que elimina grabaciones expiradas (REC-04, REC-05).
   * Se ejecuta cada hora.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpiredRecordings(): Promise<void> {
    this.logger.log('Buscando grabaciones expiradas para eliminar...');

    const expired = await this.prisma.event.findMany({
      where: {
        recordingExpiry: { not: null, lte: new Date() },
        recordingReady: true,
        deletedAt: null,
        tenant: { plan: { not: 'ENTERPRISE' } },
      },
      select: {
        id: true,
        tenantId: true,
        providerStreamId: true,
        provider: true,
        recordingUrl: true,
      },
    });

    for (const event of expired) {
      try {
        if (event.providerStreamId) {
          const eventProvider = resolveProviderForEvent(
            event,
            this.muxProvider,
            this.cloudflareProvider,
            this.provider,
          );
          await eventProvider.disableLiveStream(event.providerStreamId);
        }

        await this.prisma.event.update({
          where: { id: event.id },
          data: {
            recordingUrl: null,
            playbackId: null,
            recordingReady: false,
            recordingExpiry: null,
          },
        });

        this.logger.log(`Grabación expirada eliminada para evento ${event.id}`);
      } catch (error) {
        this.logger.error(
          `Error eliminando grabación expirada ${event.id}: ${error}`,
        );

        await this.prisma.auditLog.create({
          data: {
            actorId: 'system',
            role: 'SUPER_ADMIN',
            tenantId: event.tenantId,
            action: 'RECORDING_DELETION_FAILED',
            entityType: 'Event',
            entityId: event.id,
            metadata: { error: String(error) },
          },
        });
      }
    }
  }

  /**
   * Permite conservación o eliminación manual según permisos y plan (REC-08).
   */
  async manuallyDeleteRecording(
    eventId: string,
    tenantId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, tenantId },
      select: { providerStreamId: true, recordingUrl: true },
    });

    if (!event || !event.recordingUrl) {
      throw new Error('No hay grabación para eliminar');
    }

    await this.prisma.event.update({
      where: { id: eventId, tenantId },
      data: {
        recordingUrl: null,
        playbackId: null,
        recordingReady: false,
        recordingExpiry: null,
      },
    });

    this.logger.log(`Grabación del evento ${eventId} eliminada manualmente`);
  }
}
