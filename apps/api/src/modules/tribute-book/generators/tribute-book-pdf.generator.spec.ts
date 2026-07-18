import {
  TributeBookPdfGenerator,
  TributeBookContext,
} from './tribute-book-pdf.generator';
import { FilesService } from '../../files/files.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharpFactory = require('sharp') as (input: Buffer) => {
  webp(): { toBuffer(): Promise<Buffer> };
};

describe('TributeBookPdfGenerator', () => {
  let filesService: jest.Mocked<FilesService>;
  let generator: TributeBookPdfGenerator;

  const baseContext = (
    overrides: Partial<TributeBookContext> = {},
  ): TributeBookContext => ({
    deceased: {
      firstName: 'María',
      lastName: 'López',
      birthDate: new Date('1945-03-15'),
      deathDate: new Date('2026-07-01'),
      epitaph: 'Con amor eterno',
      photoUrl: null,
    },
    tenantName: 'Funeraria Demo',
    tenantLogoUrl: null,
    messages: [
      {
        authorName: 'Juan Pérez',
        content: 'Un abrazo enorme',
        iconType: null,
        createdAt: new Date('2026-07-02'),
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    filesService = {
      readLocalFile: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<FilesService>;
    generator = new TributeBookPdfGenerator(filesService);
  });

  it('generates a non-empty valid PDF buffer', async () => {
    const buffer = await generator.generate(baseContext());

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders an initials-based cover when there is no photo', async () => {
    filesService.readLocalFile.mockResolvedValue(null);

    const buffer = await generator.generate(baseContext());

    expect(filesService.readLocalFile).not.toHaveBeenCalled();
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('embeds the photo when photoUrl is present', async () => {
    // 1x1 transparent PNG
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    filesService.readLocalFile.mockResolvedValue(pngBuffer);

    const buffer = await generator.generate(
      baseContext({
        deceased: {
          ...baseContext().deceased,
          photoUrl: 'http://x/photo.webp',
        },
      }),
    );

    expect(filesService.readLocalFile).toHaveBeenCalledWith(
      'http://x/photo.webp',
    );
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('embeds a real WEBP photo without throwing (pdfkit only decodes JPEG/PNG natively)', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const webpBuffer = await sharpFactory(pngBuffer).webp().toBuffer();
    filesService.readLocalFile.mockResolvedValue(webpBuffer);

    const buffer = await generator.generate(
      baseContext({
        deceased: {
          ...baseContext().deceased,
          photoUrl: 'http://x/photo.webp',
        },
      }),
    );

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('handles multiple messages across pages without throwing', async () => {
    const manyMessages = Array.from({ length: 50 }, (_, i) => ({
      authorName: `Autor ${i}`,
      content: 'Mensaje de condolencia '.repeat(10),
      iconType: null,
      createdAt: new Date('2026-07-02'),
    }));

    const buffer = await generator.generate(
      baseContext({ messages: manyMessages }),
    );

    expect(buffer.length).toBeGreaterThan(0);
  });

  it('renders a known iconType as a Spanish label without throwing', async () => {
    const buffer = await generator.generate(
      baseContext({
        messages: [
          {
            authorName: 'Ana Gómez',
            content: 'Que descanses en paz',
            iconType: 'CANDLE',
            createdAt: new Date('2026-07-02'),
          },
        ],
      }),
    );

    expect(buffer.length).toBeGreaterThan(0);
  });

  it('ignores an unknown iconType without throwing', async () => {
    const buffer = await generator.generate(
      baseContext({
        messages: [
          {
            authorName: 'Ana Gómez',
            content: 'Que descanses en paz',
            iconType: 'UNKNOWN_TYPE',
            createdAt: new Date('2026-07-02'),
          },
        ],
      }),
    );

    expect(buffer.length).toBeGreaterThan(0);
  });
});
