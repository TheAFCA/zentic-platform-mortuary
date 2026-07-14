import { Injectable } from '@nestjs/common';
// pdfkit exporta con `export =` (clase invocable con `new`). Sin esModuleInterop, ni el default
// import (resuelve a `.default`, undefined) ni el namespace import (TS no lo tipa como
// invocable con `new`) sirven; esta es la única forma que preserva el tipo real en runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');
import { FilesService } from '../../files/files.service';
import { PdfGenerator } from './pdf-generator.interface';

export interface TributeBookMessage {
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface TributeBookContext {
  deceased: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    deathDate: Date | null;
    epitaph: string | null;
    photoUrl: string | null;
  };
  tenantName: string;
  tenantLogoUrl: string | null;
  messages: TributeBookMessage[];
}

const PAGE_MARGIN = 50;
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
};

@Injectable()
export class TributeBookPdfGenerator implements PdfGenerator<TributeBookContext> {
  constructor(private readonly filesService: FilesService) {}

  async generate(context: TributeBookContext): Promise<Buffer> {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    await this.renderCover(doc, context);
    doc.addPage();
    this.renderIntro(doc, context);
    doc.addPage();
    this.renderMessages(doc, context.messages);
    doc.addPage();
    await this.renderBackCover(doc, context);

    doc.end();
    return finished;
  }

  private async renderCover(
    doc: PDFKit.PDFDocument,
    context: TributeBookContext,
  ): Promise<void> {
    const { deceased } = context;
    const centerX = doc.page.width / 2;
    const fullName = `${deceased.firstName} ${deceased.lastName}`;
    const photoBuffer = deceased.photoUrl
      ? await this.filesService.readLocalFile(deceased.photoUrl)
      : null;

    const photoSize = 200;
    if (photoBuffer) {
      doc.image(photoBuffer, centerX - photoSize / 2, 120, {
        width: photoSize,
        height: photoSize,
        fit: [photoSize, photoSize],
      });
    } else {
      this.renderInitialsCircle(
        doc,
        fullName,
        centerX,
        120 + photoSize / 2,
        photoSize / 2,
      );
    }

    doc.y = 120 + photoSize + 40;
    doc.fontSize(24).font('Helvetica-Bold').text(fullName, { align: 'center' });
    doc.font('Helvetica');

    const dates = [deceased.birthDate, deceased.deathDate]
      .filter((date): date is Date => date !== null)
      .map((date) => formatDate(date))
      .join('  —  ');
    if (dates) {
      doc.moveDown(0.5).fontSize(12).text(dates, { align: 'center' });
    }

    if (deceased.epitaph) {
      doc
        .moveDown(1.5)
        .fontSize(14)
        .font('Helvetica-Oblique')
        .text(`"${deceased.epitaph}"`, { align: 'center' });
      doc.font('Helvetica');
    }
  }

  private renderIntro(
    doc: PDFKit.PDFDocument,
    context: TributeBookContext,
  ): void {
    doc.fontSize(18).font('Helvetica-Bold').text('Libro de Homenajes', {
      align: 'center',
    });
    doc.font('Helvetica').moveDown(2);
    doc
      .fontSize(12)
      .text(
        `Este libro reúne las palabras de cariño que familiares y allegados dejaron en memoria de ${context.deceased.firstName} ${context.deceased.lastName}. Cada mensaje es un recuerdo que permanece.`,
        { align: 'center' },
      );
  }

  private renderMessages(
    doc: PDFKit.PDFDocument,
    messages: TributeBookMessage[],
  ): void {
    doc.fontSize(16).font('Helvetica-Bold').text('Mensajes de condolencia', {
      underline: true,
    });
    doc.font('Helvetica').moveDown();

    messages.forEach((message, index) => {
      if (index > 0) {
        doc.moveDown(1);
      }
      if (doc.y > doc.page.height - PAGE_MARGIN - 100) {
        doc.addPage();
      }

      doc.fontSize(12).font('Helvetica-Bold').text(message.authorName);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#666666')
        .text(formatDate(message.createdAt));
      doc.fillColor('#000000').fontSize(11).text(message.content);
    });
  }

  private async renderBackCover(
    doc: PDFKit.PDFDocument,
    context: TributeBookContext,
  ): Promise<void> {
    const logoBuffer = context.tenantLogoUrl
      ? await this.filesService.readLocalFile(context.tenantLogoUrl)
      : null;
    const centerX = doc.page.width / 2;
    const logoSize = 120;

    doc.y = doc.page.height / 2 - logoSize;
    if (logoBuffer) {
      doc.image(logoBuffer, centerX - logoSize / 2, doc.y, {
        width: logoSize,
        fit: [logoSize, logoSize],
      });
      doc.y += logoSize + 20;
    }

    doc.fontSize(14).text(context.tenantName, { align: 'center' });
  }

  private renderInitialsCircle(
    doc: PDFKit.PDFDocument,
    fullName: string,
    centerX: number,
    centerY: number,
    radius: number,
  ): void {
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    doc.save();
    doc.circle(centerX, centerY, radius).fill('#1a1a2e');
    doc
      .fillColor('#ffffff')
      .fontSize(radius)
      .text(initials, centerX - radius, centerY - radius / 2, {
        width: radius * 2,
        align: 'center',
      });
    doc.restore();
    doc.fillColor('#000000');
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CO', DATE_FORMAT_OPTIONS);
}
