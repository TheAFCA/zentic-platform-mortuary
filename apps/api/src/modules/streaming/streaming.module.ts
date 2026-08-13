import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StreamingController } from './streaming.controller';
import { StreamWebhooksController } from './stream-webhooks.controller';
import { StreamingService } from './streaming.service';
import { StreamingRepository } from './streaming.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { MuxStreamProvider } from './providers/mux-stream.provider';
import { CloudflareStreamProvider } from './providers/cloudflare-stream.provider';
import { streamProviderFactory } from './providers/stream-provider.factory';
import { StreamAccessService } from './stream-access.service';
import { EventStateDomainModule } from './domain/event-state-domain.module';
import { ProvisioningSagaService } from './domain/provisioning-saga.service';
import { ReconciliationTaskService } from './domain/reconciliation-task.service';
import { RecordingService } from './services/recording.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationsModule,
    EmailModule,
    EventStateDomainModule,
  ],
  controllers: [StreamingController, StreamWebhooksController],
  providers: [
    StreamingService,
    StreamingRepository,
    MuxStreamProvider,
    CloudflareStreamProvider,
    streamProviderFactory,
    StreamAccessService,
    ProvisioningSagaService,
    ReconciliationTaskService,
    RecordingService,
  ],
  exports: [StreamingService],
})
export class StreamingModule {}
