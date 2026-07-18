import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TributeBookController } from './tribute-book.controller';
import { TributeBookService } from './tribute-book.service';
import { TributeBookRepository } from './tribute-book.repository';
import { TributeBookCleanupService } from './tribute-book-cleanup.service';
import { PdfFactory } from './factories/pdf.factory';
import { TributeBookPdfGenerator } from './generators/tribute-book-pdf.generator';

@Module({
  imports: [FilesModule, NotificationsModule],
  controllers: [TributeBookController],
  providers: [
    TributeBookService,
    TributeBookRepository,
    TributeBookCleanupService,
    PdfFactory,
    TributeBookPdfGenerator,
  ],
  exports: [TributeBookService],
})
export class TributeBookModule {}
