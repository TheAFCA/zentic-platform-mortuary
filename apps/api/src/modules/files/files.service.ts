import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join, normalize } from 'path';

const UPLOADS_ROOT = join(process.cwd(), 'uploads');

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

export interface UploadableFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export interface UploadOptions {
  maxSizeBytes: number;
}

/**
 * TODO(post-HU5): migrar a R2/S3 usando STORAGE_PROVIDER / R2_* (ver env.validation.ts).
 * Esta implementación en disco local es un puente temporal para no bloquear el Módulo 05 en
 * infraestructura cloud — no apuntar esto a un volumen persistente en producción.
 */
@Injectable()
export class FilesService {
  constructor(private readonly config: ConfigService) {}

  async upload(
    file: UploadableFile,
    folder: string,
    options: UploadOptions,
  ): Promise<string> {
    const extension = MIME_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Formato no soportado. Use PNG, JPG o SVG');
    }
    if (file.buffer.byteLength > options.maxSizeBytes) {
      const maxMb = Math.round(options.maxSizeBytes / (1024 * 1024));
      throw new BadRequestException(
        `El archivo excede el máximo de ${maxMb}MB`,
      );
    }

    const targetDir = join(UPLOADS_ROOT, folder);
    await mkdir(targetDir, { recursive: true });

    const filename = `${randomUUID()}.${extension}`;
    await writeFile(join(targetDir, filename), file.buffer);

    const baseUrl = this.config.get<string>(
      'BACKEND_URL',
      'http://localhost:3000',
    );
    return `${baseUrl}/uploads/${folder}/${filename}`;
  }

  async delete(fileUrl: string): Promise<void> {
    const marker = '/uploads/';
    const index = fileUrl.indexOf(marker);
    if (index === -1) return;

    const relativePath = fileUrl.slice(index + marker.length);
    const filePath = normalize(join(UPLOADS_ROOT, relativePath));
    if (!filePath.startsWith(UPLOADS_ROOT)) return;

    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Lee el archivo en disco a partir de la URL pública devuelta por upload().
   * TODO(post-HU5): al migrar a R2/S3 esto pasa a ser un fetch HTTP a la URL firmada.
   */
  async readLocalFile(fileUrl: string): Promise<Buffer | null> {
    const marker = '/uploads/';
    const index = fileUrl.indexOf(marker);
    if (index === -1) return null;

    const relativePath = fileUrl.slice(index + marker.length);
    const filePath = normalize(join(UPLOADS_ROOT, relativePath));
    if (!filePath.startsWith(UPLOADS_ROOT)) return null;

    try {
      return await readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
}
