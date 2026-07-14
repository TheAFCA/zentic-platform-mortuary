import { NotImplementedException } from '@nestjs/common';
import { PdfFactory } from './pdf.factory';
import { TributeBookPdfGenerator } from '../generators/tribute-book-pdf.generator';

describe('PdfFactory', () => {
  let tributeBookGenerator: TributeBookPdfGenerator;
  let factory: PdfFactory;

  beforeEach(() => {
    tributeBookGenerator = Object.create(
      TributeBookPdfGenerator.prototype,
    ) as TributeBookPdfGenerator;
    factory = new PdfFactory(tributeBookGenerator);
  });

  it('returns the TributeBookPdfGenerator for TRIBUTE_BOOK', () => {
    expect(factory.create('TRIBUTE_BOOK')).toBe(tributeBookGenerator);
  });

  it('throws NotImplementedException for INVITATION (Módulo de Invitaciones, fuera de alcance)', () => {
    expect(() => factory.create('INVITATION')).toThrow(NotImplementedException);
  });
});
