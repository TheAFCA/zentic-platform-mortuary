import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { S3StorageService } from './s3-storage.service';
import { FilesController } from './files.controller';

@Module({
  controllers: [FilesController],
  providers: [FilesService, S3StorageService],
  exports: [FilesService],
})
export class FilesModule {}
