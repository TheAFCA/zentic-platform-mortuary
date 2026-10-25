import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { S3StorageService } from './s3-storage.service';

describe('FilesService with S3', () => {
  const base = 'https://homena.test/api/files/images';
  const key = 'deceased/tenant-1/12345678-1234-1234-1234-123456789abc.webp';
  const storage = {
    enabled: true,
    put: jest.fn(),
    read: jest.fn(),
    delete: jest.fn(),
  };
  let service: FilesService;

  beforeEach(() => {
    jest.resetAllMocks();
    storage.read.mockResolvedValue(Buffer.from('image'));
    service = new FilesService(
      new ConfigService({ STORAGE_PUBLIC_URL: base }),
      storage as unknown as S3StorageService,
    );
  });

  it('uploads a new image and returns an HTTPS application URL', async () => {
    const buffer = Buffer.from('image');
    const url = await service.upload(
      { buffer, mimetype: 'image/webp', originalname: 'photo.webp' },
      'deceased/tenant-1',
      { maxSizeBytes: 1024 },
    );
    expect(url).toMatch(
      /^https:\/\/homena.test\/api\/files\/images\/deceased\/tenant-1\/[0-9a-f-]+\.webp$/,
    );
    expect(storage.put).toHaveBeenCalledWith(
      url.slice(base.length + 1),
      buffer,
      'image/webp',
    );
  });

  it('reads S3 photos for invitation and PDF consumers', async () => {
    await expect(service.readLocalFile(base + '/' + key)).resolves.toEqual(
      Buffer.from('image'),
    );
    expect(storage.read).toHaveBeenCalledWith(key);
  });

  it('deletes replaced S3 assets by their managed key', async () => {
    await service.delete(base + '/' + key);
    expect(storage.delete).toHaveBeenCalledWith(key);
  });

  it('does not use arbitrary external URLs as S3 keys', async () => {
    await expect(
      service.readLocalFile('https://other.test/' + key),
    ).resolves.toBeNull();
    await service.delete('https://other.test/' + key);
    expect(storage.read).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('does not expose private storage through public image reads', async () => {
    await expect(
      service.readPublicImage('private-storage/tenant-1/document.pdf'),
    ).resolves.toBeNull();
    await expect(
      service.readPublicImage('../private-storage/document.pdf'),
    ).resolves.toBeNull();
    expect(storage.read).not.toHaveBeenCalled();
  });

  it('does not write an oversized image to S3', async () => {
    await expect(
      service.upload(
        {
          buffer: Buffer.alloc(1025),
          mimetype: 'image/png',
          originalname: 'photo.png',
        },
        'brand/tenant-1',
        { maxSizeBytes: 1024 },
      ),
    ).rejects.toThrow();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('does not fall back to local storage on an S3 upload failure', async () => {
    storage.put.mockRejectedValue(new Error('Unavailable'));
    await expect(
      service.upload(
        {
          buffer: Buffer.from('image'),
          mimetype: 'image/png',
          originalname: 'photo.png',
        },
        'brand/tenant-1',
        { maxSizeBytes: 1024 },
      ),
    ).rejects.toThrow('Unavailable');
  });
});
