import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import { sep } from 'path';
import { FilesService } from './files.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  describe('upload', () => {
    it('throws BadRequestException for an unsupported mimetype', async () => {
      // ARRANGE
      const file = {
        buffer: Buffer.from('x'),
        mimetype: 'image/bmp',
        originalname: 'logo.bmp',
      };

      // ACT & ASSERT
      await expect(
        service.upload(file, 'brand/tenant-1', { maxSizeBytes: 2_000_000 }),
      ).rejects.toThrow('Formato no soportado. Use PNG, JPG o SVG');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the file exceeds the max size', async () => {
      // ARRANGE
      const file = {
        buffer: Buffer.alloc(3 * 1024 * 1024),
        mimetype: 'image/png',
        originalname: 'logo.png',
      };

      // ACT & ASSERT
      await expect(
        service.upload(file, 'brand/tenant-1', {
          maxSizeBytes: 2 * 1024 * 1024,
        }),
      ).rejects.toThrow('El archivo excede el máximo de 2MB');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('writes the file to disk and returns a public URL under /uploads', async () => {
      // ARRANGE
      const file = {
        buffer: Buffer.from('fake-png-bytes'),
        mimetype: 'image/png',
        originalname: 'logo.png',
      };

      // ACT
      const url = await service.upload(file, 'brand/tenant-1', {
        maxSizeBytes: 2 * 1024 * 1024,
      });

      // ASSERT
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(url).toMatch(
        /^http:\/\/localhost:3000\/uploads\/brand\/tenant-1\/[\w-]+\.png$/,
      );
    });
  });

  describe('delete', () => {
    it('is a no-op when the URL has no /uploads/ segment', async () => {
      // ACT
      await service.delete('http://cdn.example.com/other/logo.png');

      // ASSERT
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('unlinks the resolved local path for a valid uploads URL', async () => {
      // ARRANGE
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // ACT
      await service.delete(
        'http://localhost:3000/uploads/brand/tenant-1/abc.png',
      );

      // ASSERT
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining(
          `uploads${sep}brand${sep}tenant-1${sep}abc.png`,
        ),
      );
    });

    it('swallows ENOENT errors when the file is already gone', async () => {
      // ARRANGE
      const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' });
      (fs.unlink as jest.Mock).mockRejectedValue(enoent);

      // ACT & ASSERT
      await expect(
        service.delete('http://localhost:3000/uploads/brand/tenant-1/abc.png'),
      ).resolves.toBeUndefined();
    });

    it('re-throws non-ENOENT errors', async () => {
      // ARRANGE
      const permissionError = Object.assign(new Error('denied'), {
        code: 'EACCES',
      });
      (fs.unlink as jest.Mock).mockRejectedValue(permissionError);

      // ACT & ASSERT
      await expect(
        service.delete('http://localhost:3000/uploads/brand/tenant-1/abc.png'),
      ).rejects.toThrow('denied');
    });
  });
});
