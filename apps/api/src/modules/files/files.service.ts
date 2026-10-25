import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { validateImageUpload } from './image-upload.options';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { S3StorageService } from './s3-storage.service';

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

@Injectable()
export class FilesService {
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly s3?: S3StorageService,
  ) {}

  private get publicBaseUrl(): string {
    return this.config
      .getOrThrow<string>('STORAGE_PUBLIC_URL')
      .replace(/\/+$/, '');
  }

  private managedS3Key(fileUrl: string): string | null {
    if (!this.s3?.enabled) return null;
    const prefix = this.publicBaseUrl + '/';
    if (!fileUrl.startsWith(prefix)) return null;
    const key = fileUrl.slice(prefix.length);
    return this.isImageKey(key) ? key : null;
  }

  private isImageKey(key: string): boolean {
    return /^(brand|deceased|invitations)\/[a-zA-Z0-9_-]+\/[0-9a-f-]{36}\.(png|jpg|webp|svg)$/.test(
      key,
    );
  }

  /** Public image assets only. Private PDFs never pass through this endpoint. */
  async readPublicImage(
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!this.isImageKey(key) || !this.s3?.enabled) return null;
    const buffer = await this.s3.read(key);
    if (!buffer) return null;
    const extension = key.split('.').pop();
    const contentType = Object.entries(MIME_EXTENSIONS).find(
      ([, ext]) => ext === extension,
    )?.[0];
    return contentType ? { buffer, contentType } : null;
  }

  async upload(
    file: UploadableFile,
    folder: string,
    options: UploadOptions,
  ): Promise<string> {
    const extension = MIME_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Formato no soportado. Use PNG, JPG o SVG');
    }
    validateImageUpload(file.buffer, options.maxSizeBytes);

    if (!/^(brand|deceased|invitations)\/[a-zA-Z0-9_-]+$/.test(folder)) {
      throw new BadRequestException('Carpeta de imágenes no válida');
    }
    if (this.s3?.enabled) {
      const key = `${folder}/${randomUUID()}.${extension}`;
      // Resolve configuration before writing to avoid orphaned objects.
      const url = `${this.publicBaseUrl}/${key}`;
      await this.s3.put(key, file.buffer, file.mimetype);
      return url;
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
    const s3Key = this.managedS3Key(fileUrl);
    if (s3Key) {
      await this.s3!.delete(s3Key);
      return;
    }
    const marker = '/uploads/';
    const index = fileUrl.indexOf(marker);
    if (index === -1) return;

    const relativePath = fileUrl.slice(index + marker.length);
    const filePath = resolve(UPLOADS_ROOT, relativePath);
    if (!filePath.startsWith(UPLOADS_ROOT + sep)) return;

    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /** Reads managed S3 assets and legacy local uploads without fetching arbitrary URLs. */
  async readLocalFile(fileUrl: string): Promise<Buffer | null> {
    const s3Key = this.managedS3Key(fileUrl);
    if (s3Key) return this.s3!.read(s3Key);
    const marker = '/uploads/';
    const index = fileUrl.indexOf(marker);
    if (index === -1) return null;

    const relativePath = fileUrl.slice(index + marker.length);
    const filePath = resolve(UPLOADS_ROOT, relativePath);
    if (!filePath.startsWith(UPLOADS_ROOT + sep)) return null;

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
    const filePath = resolve(PRIVATE_STORAGE_ROOT, relativePath);
    if (!filePath.startsWith(PRIVATE_STORAGE_ROOT + sep)) return null;

    try {
      return await readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
}
