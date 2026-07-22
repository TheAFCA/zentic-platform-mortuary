import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join, normalize } from 'path';

const UPLOADS_ROOT = join(process.cwd(), 'uploads');

/**
 * Directorio FUERA de `uploads/` — no está montado por `useStaticAssets` en main.ts.
 * Los archivos generados aquí (ej: PDFs del Libro de Homenajes) solo son accesibles a través
 * de un endpoint autenticado que valide permisos/expiración, nunca por URL directa.
 */
const PRIVATE_STORAGE_ROOT = join(process.cwd(), 'private-storage');

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

  /**
   * Guarda un archivo generado por el servidor (ej: PDF del Libro de Homenajes) fuera del
   * directorio servido estáticamente. Devuelve una ruta relativa (no una URL) que solo tiene
   * sentido para `readPrivateFile` — el llamador es responsable de controlar el acceso.
   */
  async savePrivateFile(
    buffer: Buffer,
    folder: string,
    extension: string,
  ): Promise<string> {
    const targetDir = join(PRIVATE_STORAGE_ROOT, folder);
    await mkdir(targetDir, { recursive: true });

    const filename = `${randomUUID()}.${extension}`;
    await writeFile(join(targetDir, filename), buffer);

    return `${folder}/${filename}`;
  }

  async readPrivateFile(relativePath: string): Promise<Buffer | null> {
    const filePath = normalize(join(PRIVATE_STORAGE_ROOT, relativePath));
    if (!filePath.startsWith(PRIVATE_STORAGE_ROOT)) return null;

    try {
      return await readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
}
