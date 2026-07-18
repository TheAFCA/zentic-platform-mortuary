import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TributeBookRepository } from './tribute-book.repository';

const RETENTION_DAYS = 30;

/**
 * RN-TRIB-003: los mensajes en papelera se eliminan permanentemente 30 días después
 * del soft delete. Barrido global (no por tenant), corre una vez al día.
 */
@Injectable()
export class TributeBookCleanupService {
  private readonly logger = new Logger(TributeBookCleanupService.name);

  constructor(private readonly repo: TributeBookRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredTrash(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const { streamingDeleted, obituaryDeleted } =
      await this.repo.hardDeleteOlderThan(cutoff);

    if (streamingDeleted > 0 || obituaryDeleted > 0) {
      this.logger.log(
        `Papelera purgada: ${streamingDeleted} mensajes de streaming, ${obituaryDeleted} de obituario`,
      );
    }
  }
}
