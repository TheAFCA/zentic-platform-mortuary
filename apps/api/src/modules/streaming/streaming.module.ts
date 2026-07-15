import { Module } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { StreamWebhooksController } from './stream-webhooks.controller';
import { StreamingService } from './streaming.service';
import { StreamingRepository } from './streaming.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { MuxStreamProvider } from './providers/mux-stream.provider';
import { CloudflareStreamProvider } from './providers/cloudflare-stream.provider';
import { streamProviderFactory } from './providers/stream-provider.factory';

@Module({
  imports: [NotificationsModule, EmailModule],
  controllers: [StreamingController, StreamWebhooksController],
  providers: [
    StreamingService,
    StreamingRepository,
    MuxStreamProvider,
    CloudflareStreamProvider,
    streamProviderFactory,
  ],
  exports: [StreamingService],
})
export class StreamingModule {}
