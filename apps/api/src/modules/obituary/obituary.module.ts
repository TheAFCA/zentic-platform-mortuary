import { Module } from '@nestjs/common';
import { ObituaryController } from './obituary.controller';
import { ObituaryService } from './obituary.service';
import { ObituaryRepository } from './obituary.repository';

@Module({
  controllers: [ObituaryController],
  providers: [ObituaryService, ObituaryRepository],
  exports: [ObituaryService],
})
export class ObituaryModule {}
