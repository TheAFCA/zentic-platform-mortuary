import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ObituaryController } from './obituary.controller';
import { ObituaryService } from './obituary.service';
import { ObituaryRepository } from './obituary.repository';
import { PdfFactory } from './factories/pdf.factory';
import { TributeBookPdfGenerator } from './generators/tribute-book-pdf.generator';
import { DeceasedPhotoService } from './services/deceased-photo.service';

@Module({
  imports: [FilesModule],
  controllers: [ObituaryController],
  providers: [
    ObituaryService,
    ObituaryRepository,
    PdfFactory,
    TributeBookPdfGenerator,
    DeceasedPhotoService,
  ],
  exports: [ObituaryService],
})
export class ObituaryModule {}
