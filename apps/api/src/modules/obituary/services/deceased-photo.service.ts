import { Injectable } from '@nestjs/common';
import { FilesService, UploadableFile } from '../../files/files.service';

// sharp publica un paquete dual ESM/CJS cuyo campo "types" raíz apunta al build ESM
// (dist/index.d.mts, sin `export =`), mientras que en runtime bajo CommonJS (nuestro tsconfig,
// sin moduleResolution "bundler"/"node16") lo que se ejecuta es el build CJS (dist/index.cjs,
// `module.exports = sharp` invocable). Ningún import estándar tipa correctamente el valor real
// en runtime — de ahí el require() + shim local mínimo con los únicos métodos que usamos.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharpFactory = require('sharp') as (input: Buffer) => SharpPipeline;

interface SharpMetadata {
  width?: number;
  height?: number;
}

interface SharpPipeline {
  metadata(): Promise<SharpMetadata>;
  resize(
    width: number,
    height: number,
    options: { fit: 'cover'; position: 'centre' },
  ): SharpPipeline;
  webp(options: { quality: number }): SharpPipeline;
  toBuffer(): Promise<Buffer>;
}

const TARGET_SIZE = 800;
const MAX_VISIBLE_BYTES = 1_000_000; // RF-OBT-002: máx. 1MB visible
const UPLOAD_CEILING_BYTES = 2_000_000; // margen de seguridad si la compresión no converge
const MIN_QUALITY = 40;
const QUALITY_STEP = 10;
const INITIAL_QUALITY = 80;
const MIN_RECOMMENDED_DIMENSION = 400;

export interface ProcessedPhoto {
  photoUrl: string;
  lowResolutionWarning: boolean;
}

@Injectable()
export class DeceasedPhotoService {
  constructor(private readonly filesService: FilesService) {}

  async process(
    tenantId: string,
    file: UploadableFile,
  ): Promise<ProcessedPhoto> {
    const metadata = await sharpFactory(file.buffer).metadata();
    // Caso borde §12 del spec: se acepta pero se advierte, no se bloquea la subida.
    const lowResolutionWarning =
      (metadata.width ?? 0) < MIN_RECOMMENDED_DIMENSION ||
      (metadata.height ?? 0) < MIN_RECOMMENDED_DIMENSION;

    const optimizedBuffer = await this.optimize(file.buffer);

    const photoUrl = await this.filesService.upload(
      {
        buffer: optimizedBuffer,
        mimetype: 'image/webp',
        originalname: file.originalname,
      },
      `deceased/${tenantId}`,
      { maxSizeBytes: UPLOAD_CEILING_BYTES },
    );

    return { photoUrl, lowResolutionWarning };
  }

  private async optimize(buffer: Buffer): Promise<Buffer> {
    let quality = INITIAL_QUALITY;
    let output = await this.render(buffer, quality);

    while (output.byteLength > MAX_VISIBLE_BYTES && quality > MIN_QUALITY) {
      quality -= QUALITY_STEP;
      output = await this.render(buffer, quality);
    }

    return output;
  }

  private render(buffer: Buffer, quality: number): Promise<Buffer> {
    // RF-OBT-002: recorte centrado cuadrado + conversión a WebP.
    return sharpFactory(buffer)
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'cover', position: 'centre' })
      .webp({ quality })
      .toBuffer();
  }
}
