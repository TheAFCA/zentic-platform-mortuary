// Shared by the browser and API. Sizes are binary units (MiB/KiB).
export const IMAGE_UPLOAD_LIMITS = {
  photo: 5 * 1024 * 1024,
  logo: 2 * 1024 * 1024,
  favicon: 512 * 1024,
} as const;

export const PHOTO_MIME_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];

export const BRAND_IMAGE_MIME_TYPES: readonly string[] = [...PHOTO_MIME_TYPES, 'image/svg+xml'];

export function formatUploadSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${Number((bytes / (1024 * 1024)).toFixed(2))} MB`
    : `${Number((bytes / 1024).toFixed(2))} KB`;
}
