import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { formatUploadSize } from '@zentic/shared-types';

/** Reject oversized multipart files before buffering and image processing. */
export function imageUploadOptions(
  maxSizeBytes: number,
  mimeTypes: readonly string[],
): MulterOptions {
  return {
    limits: { fileSize: maxSizeBytes, files: 1, fields: 0 },
    fileFilter: (_request, file, callback) => {
      if (!mimeTypes.includes(file.mimetype)) {
        callback(
          new BadRequestException('Formato de imagen no soportado'),
          false,
        );
        return;
      }
      callback(null, true);
    },
  };
}

export function validateImageUpload(
  buffer: Buffer,
  maxSizeBytes: number,
): void {
  if (buffer.byteLength === 0) {
    throw new BadRequestException('El archivo está vacío');
  }
  if (buffer.byteLength > maxSizeBytes) {
    throw new BadRequestException(
      `El archivo excede el máximo de ${formatUploadSize(maxSizeBytes)}`,
    );
  }
}
