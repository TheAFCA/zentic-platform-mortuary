import { Module } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';
import { StreamingRepository } from './streaming.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvitationsModule } from '../invitations/invitations.module';

@Module({
  imports: [NotificationsModule, InvitationsModule],
  controllers: [StreamingController],
  providers: [StreamingService, StreamingRepository],
  exports: [StreamingService],
})
export class StreamingModule {}
