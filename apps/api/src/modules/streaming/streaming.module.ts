import { Module } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';
import { StreamingRepository } from './streaming.repository';

@Module({
  controllers: [StreamingController],
  providers: [StreamingService, StreamingRepository],
  exports: [StreamingService],
})
export class StreamingModule {}
