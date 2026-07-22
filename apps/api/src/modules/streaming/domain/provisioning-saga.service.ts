import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventStateMachineService } from './event-state-machine.service';
import {
  StreamProvider,
  STREAM_PROVIDER_TOKEN,
} from '../providers/stream-provider.interface';
import { withProviderTimeout } from '../providers/stream-provider.factory';

@Injectable()
export class ProvisioningSagaService {
  private readonly logger = new Logger(ProvisioningSagaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: EventStateMachineService,
    @Inject(STREAM_PROVIDER_TOKEN) private readonly provider: StreamProvider,
  ) {}

  /**
   * Saga para coordinar la creación local y remota de un live stream.
   * 1. Crea el evento local en estado SCHEDULED
   * 2. Transiciona a PROVISIONING
   * 3. Crea el recurso remoto en el proveedor
   * 4. Si falla, compensa: marca como PROVISION_FAILED o elimina el evento provisional
   * 5. Si la persistencia falla después del recurso remoto, elimina el recurso remoto
   */
  async provisionEvent(
    tenantId: string,
    eventId: string,
    isPublic: boolean,
  ): Promise<void> {
    this.logger.log(
      `Iniciando saga de aprovisionamiento para evento ${eventId}`,
    );

    const event = await this.prisma.event.findUnique({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      this.logger.error(`Evento ${eventId} no encontrado para aprovisionar`);
      return;
    }

    const transitionResult = await this.stateMachine.transition(
      tenantId,
      eventId,
      event.status,
      'PROVISIONING',
      'provision_start',
      { tenantId, eventId, source: 'provisioning_saga' },
    );

    if (!transitionResult.success) {
      this.logger.error(
        `No se pudo iniciar aprovisionamiento para evento ${eventId}`,
      );
      return;
    }

    let providerStreamId: string | undefined;
    let streamKey: string | undefined;
    let rtmpUrl: string | undefined;

    try {
      const result = await withProviderTimeout(
        this.provider,
        'createLiveStream',
        () => this.provider.createLiveStream({ signedPlayback: !isPublic }),
      );

      providerStreamId = result.providerStreamId;
      streamKey = result.streamKey;
      rtmpUrl = result.rtmpUrl;

      await this.prisma.event.update({
        where: { id: eventId, tenantId },
        data: {
          streamKey,
          rtmpUrl,
          provider: this.provider.name,
          providerStreamId,
          playbackId: result.playbackId,
          playbackPolicy: result.playbackPolicy,
          ...(result.playbackUrl ? { recordingUrl: result.playbackUrl } : {}),
        },
      });

      // Aprovisionar credenciales no equivale a tener señal de video. El
      // operador inicia LIVE solamente después de que OBS/Mux confirme señal.
      const completed = await this.stateMachine.transition(
        tenantId,
        eventId,
        'PROVISIONING',
        'SCHEDULED',
        'provision_success',
        { tenantId, eventId, source: 'provisioning_saga' },
      );
      if (!completed.success) {
        throw new Error(
          completed.error ?? 'No se pudo completar el aprovisionamiento',
        );
      }

      this.logger.log(`Evento ${eventId} aprovisionado exitosamente`);
    } catch (error) {
      this.logger.error(
        `Error en aprovisionamiento del evento ${eventId}: ${error}`,
      );

      await this.stateMachine
        .transition(
          tenantId,
          eventId,
          'PROVISIONING',
          'PROVISION_FAILED',
          'provision_failure',
          {
            tenantId,
            eventId,
            source: 'provisioning_saga',
            metadata: { error: String(error) },
          },
        )
        .catch((e) => this.logger.error(`Error al marcar fallo: ${e}`));

      if (providerStreamId) {
        try {
          await this.provider.disableLiveStream(providerStreamId);
          this.logger.log(
            `Recurso remoto ${providerStreamId} eliminado por compensación`,
          );
        } catch (cleanupError) {
          this.logger.error(`Error al limpiar recurso remoto: ${cleanupError}`);
        }
      }
    }
  }

  /**
   * Reintenta el aprovisionamiento de un evento fallido.
   */
  async retryProvision(tenantId: string, eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId, tenantId },
    });

    if (!event || event.status !== 'PROVISION_FAILED') {
      this.logger.warn(`Evento ${eventId} no está en estado PROVISION_FAILED`);
      return;
    }

    await this.stateMachine.transition(
      tenantId,
      eventId,
      'PROVISION_FAILED',
      'SCHEDULED',
      'retry_provision',
      { tenantId, eventId, source: 'retry_provision' },
    );

    await this.provisionEvent(tenantId, eventId, event.isPublic);
  }
}
