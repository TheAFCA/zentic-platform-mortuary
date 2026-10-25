import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { S3StorageService } from './s3-storage.service';

describe('S3StorageService', () => {
  const settings = {
    STORAGE_PROVIDER: 's3',
    S3_ENDPOINT: 'http://garage:3900',
    S3_REGION: 'garage',
    S3_BUCKET: 'homena-imagenes',
    S3_ACCESS_KEY_ID: 'test-key',
    S3_SECRET_ACCESS_KEY: 'test-secret',
  };
  let storage: S3StorageService;
  const send = jest.spyOn(S3Client.prototype, 'send');
  beforeEach(() => {
    send.mockReset();
    storage = new S3StorageService(new ConfigService(settings));
  });
  afterEach(() => storage.onModuleDestroy());
  afterAll(() => send.mockRestore());

  it('writes with its content type to the configured bucket', async () => {
    send.mockResolvedValue({} as never);
    const body = Buffer.from('image');
    await storage.put('brand/tenant/image.png', body, 'image/png');
    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'homena-imagenes',
      Key: 'brand/tenant/image.png',
      Body: body,
      ContentType: 'image/png',
    });
  });
  it('reads bytes without fetching a public URL', async () => {
    send.mockResolvedValue({
      Body: {
        transformToByteArray: () => Promise.resolve(Buffer.from('photo')),
      },
    } as never);
    await expect(storage.read('photo.webp')).resolves.toEqual(
      Buffer.from('photo'),
    );
    expect(send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
  });
  it('returns null for a missing object', async () => {
    send.mockRejectedValue(
      Object.assign(new Error('missing'), { name: 'NoSuchKey' }) as never,
    );
    await expect(storage.read('missing.webp')).resolves.toBeNull();
  });
  it('propagates access and connection errors', async () => {
    send.mockRejectedValue(new Error('Access denied') as never);
    await expect(storage.read('photo.webp')).rejects.toThrow('Access denied');
  });
  it('removes a single object', async () => {
    send.mockResolvedValue({} as never);
    await storage.delete('photo.webp');
    expect(send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'homena-imagenes',
      Key: 'photo.webp',
    });
  });
  it('keeps local development independent of S3', async () => {
    const local = new S3StorageService(
      new ConfigService({ STORAGE_PROVIDER: 'local' }),
    );
    expect(local.enabled).toBe(false);
    await expect(
      local.put('photo', Buffer.from('x'), 'image/png'),
    ).rejects.toThrow('not configured');
    await expect(local.read('photo')).rejects.toThrow('not configured');
    await expect(local.delete('photo')).rejects.toThrow('not configured');
    local.onModuleDestroy();
  });
});
