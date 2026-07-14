const sharpChain = {
  metadata: jest.fn(),
  resize: jest.fn(),
  webp: jest.fn(),
  toBuffer: jest.fn(),
};
const sharpMock = jest.fn(() => sharpChain);

jest.mock('sharp', () => sharpMock);

import { DeceasedPhotoService } from './deceased-photo.service';
import { FilesService } from '../../files/files.service';

describe('DeceasedPhotoService', () => {
  let filesService: jest.Mocked<FilesService>;
  let service: DeceasedPhotoService;

  beforeEach(() => {
    jest.clearAllMocks();
    sharpChain.resize.mockReturnValue(sharpChain);
    sharpChain.webp.mockReturnValue(sharpChain);
    sharpMock.mockReturnValue(sharpChain);

    filesService = {
      upload: jest.fn(),
      delete: jest.fn(),
      readLocalFile: jest.fn(),
    } as unknown as jest.Mocked<FilesService>;
    service = new DeceasedPhotoService(filesService);
  });

  const inputFile = {
    buffer: Buffer.from('input'),
    mimetype: 'image/png',
    originalname: 'photo.png',
  };

  it('recorta cuadrado, convierte a WebP y sube el resultado (RF-OBT-002)', async () => {
    sharpChain.metadata.mockResolvedValue({ width: 1200, height: 1200 });
    sharpChain.toBuffer.mockResolvedValue(Buffer.alloc(500_000));
    filesService.upload.mockResolvedValue(
      'http://cdn/deceased/tenant-1/photo.webp',
    );

    const result = await service.process('tenant-1', inputFile);

    expect(sharpChain.resize).toHaveBeenCalledWith(800, 800, {
      fit: 'cover',
      position: 'centre',
    });
    expect(sharpChain.webp).toHaveBeenCalledWith({ quality: 80 });
    expect(filesService.upload).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'image/webp' }),
      'deceased/tenant-1',
      expect.any(Object),
    );
    expect(result).toEqual({
      photoUrl: 'http://cdn/deceased/tenant-1/photo.webp',
      lowResolutionWarning: false,
    });
  });

  it('marca lowResolutionWarning cuando la imagen original es menor a 400px', async () => {
    sharpChain.metadata.mockResolvedValue({ width: 200, height: 300 });
    sharpChain.toBuffer.mockResolvedValue(Buffer.alloc(100));
    filesService.upload.mockResolvedValue('http://cdn/photo.webp');

    const result = await service.process('tenant-1', inputFile);

    expect(result.lowResolutionWarning).toBe(true);
  });

  it('reduce la calidad iterativamente hasta bajar de 1MB', async () => {
    sharpChain.metadata.mockResolvedValue({ width: 1000, height: 1000 });
    sharpChain.toBuffer
      .mockResolvedValueOnce(Buffer.alloc(1_500_000))
      .mockResolvedValueOnce(Buffer.alloc(1_200_000))
      .mockResolvedValueOnce(Buffer.alloc(900_000));
    filesService.upload.mockResolvedValue('http://cdn/photo.webp');

    await service.process('tenant-1', inputFile);

    expect(sharpChain.webp).toHaveBeenNthCalledWith(1, { quality: 80 });
    expect(sharpChain.webp).toHaveBeenNthCalledWith(2, { quality: 70 });
    expect(sharpChain.webp).toHaveBeenNthCalledWith(3, { quality: 60 });
  });

  it('deja de reducir calidad al llegar al mínimo aunque siga excediendo el tamaño', async () => {
    sharpChain.metadata.mockResolvedValue({ width: 1000, height: 1000 });
    sharpChain.toBuffer.mockResolvedValue(Buffer.alloc(5_000_000));
    filesService.upload.mockResolvedValue('http://cdn/photo.webp');

    await service.process('tenant-1', inputFile);

    expect(sharpChain.webp).toHaveBeenLastCalledWith({ quality: 40 });
  });
});
