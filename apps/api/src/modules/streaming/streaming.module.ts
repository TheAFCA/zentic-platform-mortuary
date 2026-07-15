import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
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

@Module({
  imports: [NotificationsModule, EmailModule, JwtModule.register({})],
  controllers: [StreamingController, StreamWebhooksController],
  providers: [
    StreamingService,
    StreamingRepository,
    MuxStreamProvider,
    CloudflareStreamProvider,
    streamProviderFactory,
    StreamAccessService,
  ],
  exports: [StreamingService],
})
export class StreamingModule {}
