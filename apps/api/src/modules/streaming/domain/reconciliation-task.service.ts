import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { StreamProvider, STREAM_PROVIDER_TOKEN } from '../providers/stream-provider.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class ReconciliationTaskService {
  private readonly logger = new Logger(ReconciliationTaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STREAM_PROVIDER_TOKEN) private readonly provider: StreamProvider,
  ) {}

  /**
   * Tarea programada que detecta recursos huérfanos:
   * Eventos en estado PROVISIONING por más de 30 minutos.
   * Eventos que se quedaron en LIVE/PAUSED sin actividad del proveedor.
   * Se ejecuta cada hora.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async reconcileOrphanResources(): Promise<void> {
    this.logger.log('Iniciando reconciliación de recursos huérfanos...');

    const threshold = new Date(Date.now() - 30 * 60 * 1000);

    const stuckProvisioning = await this.prisma.event.findMany({
      where: {
        status: 'PROVISIONING',
        updatedAt: { lt: threshold },
        deletedAt: null,
      },
      select: { id: true, tenantId: true, providerStreamId: true },
    });

    for (const event of stuckProvisioning) {
      this.logger.warn(`Evento ${event.id} atascado en PROVISIONING desde antes de ${threshold}`);

      await this.prisma.event.update({
        where: { id: event.id },
        data: { status: 'PROVISION_FAILED' },
      });

      await this.prisma.eventStateTransition.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: event.tenantId,
          eventId: event.id,
          fromStatus: 'PROVISIONING',
          toStatus: 'PROVISION_FAILED',
          trigger: 'reconciliation',
          source: 'reconciliation',
          metadata: { reason: 'Stuck in PROVISIONING for more than 30 minutes' },
        },
      });
    }

    const orphanRemote = await this.prisma.event.findMany({
      where: {
        providerStreamId: { not: null },
        status: { in: ['LIVE', 'PAUSED', 'INTERRUPTED'] },
        updatedAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        deletedAt: null,
      },
      select: { id: true, providerStreamId: true, status: true },
    });

    for (const event of orphanRemote) {
      if (!event.providerStreamId) continue;

      try {
        const remoteStatus = await this.provider.getStreamStatus(event.providerStreamId);
        if (remoteStatus === 'idle' && (event.status === 'LIVE' || event.status === 'PAUSED')) {
          this.logger.warn(
            `Evento ${event.id} marcado como ${event.status} pero el proveedor reporta idle. Finalizando...`,
          );

          await this.prisma.event.update({
            where: { id: event.id },
            data: { status: 'INTERRUPTED', finishedAt: new Date() },
          });

          await this.prisma.eventStateTransition.create({
            data: {
              id: crypto.randomUUID(),
              tenantId: event.tenantId,
              eventId: event.id,
              fromStatus: event.status as any,
              toStatus: 'INTERRUPTED',
              trigger: 'signal_lost',
              source: 'reconciliation',
              metadata: { reason: 'Provider reports idle while local status is active' },
            },
          });
        }
      } catch (error) {
        this.logger.error(`Error consultando proveedor para evento ${event.id}: ${error}`);
      }
    }

    this.logger.log('Reconciliación completada');
  }
}
