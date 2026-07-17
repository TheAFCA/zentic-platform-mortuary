import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

export interface TransitionContext {
  tenantId: string;
  eventId: string;
  actorId?: string;
  actorRole?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  previousStatus: string;
  newStatus: string;
  transitionId?: string;
  error?: string;
}

@Injectable()
export class EventStateMachineService {
  private readonly logger = new Logger(EventStateMachineService.name);

  private readonly allowedTransitions: Record<string, string[]> = {
    SCHEDULED: ['LIVE', 'CANCELLED', 'PROVISIONING', 'FINISHED'],
    PROVISIONING: ['LIVE', 'PROVISION_FAILED'],
    PROVISION_FAILED: ['SCHEDULED'],
    LIVE: ['PAUSED', 'FINISHED', 'INTERRUPTED'],
    PAUSED: ['LIVE', 'FINISHED', 'INTERRUPTED'],
    INTERRUPTED: ['LIVE', 'PAUSED', 'FINISHED'],
    FINISHED: [],
    CANCELLED: [],
  };

  constructor(private readonly prisma: PrismaService) {}

  canTransition(fromStatus: string, toStatus: string): boolean {
    const allowed = this.allowedTransitions[fromStatus] || [];
    return allowed.includes(toStatus);
  }

  getAllowedTransitions(fromStatus: string): string[] {
    return this.allowedTransitions[fromStatus] || [];
  }

  /**
   * Transición atómica condicionada por el estado actual.
   * Usa optimistic concurrency: la condición WHERE status = fromStatus
   * garantiza que la transición solo se aplica si nadie más la cambió antes.
   * Si el estado actual no coincide, lanza ConflictException.
   */
  async transition(
    tenantId: string,
    eventId: string,
    fromStatus: string,
    toStatus: string,
    trigger: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    if (!this.canTransition(fromStatus, toStatus)) {
      throw new BadRequestException(
        `Transición inválida de ${fromStatus} a ${toStatus}`,
      );
    }

    const transitionId = randomUUID();

    try {
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.event.findUnique({
          where: { id: eventId },
          select: { status: true },
        });

        if (!current) {
          throw new BadRequestException('Evento no encontrado');
        }

        if (current.status !== fromStatus) {
          throw new ConflictException(
            `El evento cambió a "${current.status}" desde que se consultó. No se puede transicionar a "${toStatus}".`,
          );
        }

        const updated = await tx.event.updateMany({
          where: { id: eventId, tenantId, status: fromStatus as EventStatus },
          data: {
            status: toStatus as EventStatus,
            ...(toStatus === 'LIVE' && fromStatus !== 'PAUSED' ? { startedAt: new Date() } : {}),
            ...(toStatus === 'FINISHED' || toStatus === 'CANCELLED'
              ? { finishedAt: new Date() }
              : {}),
          },
        });

        if (updated.count === 0) {
          throw new ConflictException(
            `El evento ya no está en estado ${fromStatus}. Transición cancelada.`,
          );
        }

        await tx.eventStateTransition.create({
          data: {
            id: randomUUID(),
            tenantId,
            eventId,
            fromStatus: fromStatus as EventStatus,
            toStatus: toStatus as EventStatus,
            trigger,
            actorId: context.actorId,
            source: context.source || 'manual',
            metadata: (context.metadata || {}) as any,
          },
        });
      });

      this.logger.log(`Transición exitosa: ${fromStatus} -> ${toStatus} (${trigger}) [${eventId}]`);

      return {
        success: true,
        previousStatus: fromStatus,
        newStatus: toStatus,
        transitionId,
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error en transición de estado: ${error}`);
      return {
        success: false,
        previousStatus: fromStatus,
        newStatus: fromStatus,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Transición idempotente: si el evento ya está en toStatus, retorna éxito sin operación.
   */
  async transitionIdempotent(
    tenantId: string,
    eventId: string,
    fromStatus: string,
    toStatus: string,
    trigger: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    const current = await this.prisma.event.findUnique({
      where: { id: eventId, tenantId },
      select: { status: true },
    });

    if (!current) {
      throw new BadRequestException('Evento no encontrado');
    }

    if (current.status === toStatus) {
      this.logger.log(`Transición idempotente ignorada: ya en ${toStatus} [${eventId}]`);
      return {
        success: true,
        previousStatus: fromStatus,
        newStatus: toStatus,
      };
    }

    return this.transition(tenantId, eventId, current.status, toStatus, trigger, context);
  }

  async getTransitionHistory(tenantId: string, eventId: string) {
    return this.prisma.eventStateTransition.findMany({
      where: { tenantId, eventId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: { id: true, email: true },
        },
      },
    });
  }

  getValidTargets(currentStatus: string): string[] {
    return this.allowedTransitions[currentStatus] || [];
  }

  isTerminalStatus(status: string): boolean {
    return (
      this.allowedTransitions[status]?.length === 0 ||
      ['FINISHED', 'CANCELLED'].includes(status)
    );
  }
}
