import { Injectable, NotImplementedException } from '@nestjs/common';
import { PdfGenerator } from '../generators/pdf-generator.interface';
import {
  TributeBookContext,
  TributeBookPdfGenerator,
} from '../generators/tribute-book-pdf.generator';

export type PdfDocumentType = 'TRIBUTE_BOOK' | 'INVITATION';

/**
 * RF-OBT-007 (invitación digital) pertenece al módulo de Invitaciones (fuera de alcance de
 * HU-OBT) — el caso 'INVITATION' queda declarado en el factory para no tener que tocar este
 * contrato cuando ese módulo se implemente.
 */
@Injectable()
export class PdfFactory {
  constructor(private readonly tributeBookGenerator: TributeBookPdfGenerator) {}

  create(type: PdfDocumentType): PdfGenerator<TributeBookContext> {
    switch (type) {
      case 'TRIBUTE_BOOK':
        return this.tributeBookGenerator;
      case 'INVITATION':
        throw new NotImplementedException(
          'La invitación digital pertenece al módulo de Invitaciones',
        );
    }
  }
}
