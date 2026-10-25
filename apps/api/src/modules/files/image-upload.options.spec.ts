import {
  Controller,
  INestApplication,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  IMAGE_UPLOAD_LIMITS,
  BRAND_IMAGE_MIME_TYPES,
  PHOTO_MIME_TYPES,
} from '@zentic/shared-types';
import * as request from 'supertest';
import { Server } from 'http';
import {
  imageUploadOptions,
  validateImageUpload,
} from './image-upload.options';

const received = jest.fn();

@Controller('upload-test')
class UploadTestController {
  @Post('photo')
  @UseInterceptors(
    FileInterceptor(
      'file',
      imageUploadOptions(IMAGE_UPLOAD_LIMITS.photo, PHOTO_MIME_TYPES),
    ),
  )
  photo(@UploadedFile() file: Express.Multer.File) {
    received();
    return { size: file.size };
  }

  @Post('logo')
  @UseInterceptors(
    FileInterceptor(
      'file',
      imageUploadOptions(IMAGE_UPLOAD_LIMITS.logo, BRAND_IMAGE_MIME_TYPES),
    ),
  )
  logo(@UploadedFile() file: Express.Multer.File) {
    received();
    return { size: file.size };
  }

  @Post('favicon')
  @UseInterceptors(
    FileInterceptor(
      'file',
      imageUploadOptions(IMAGE_UPLOAD_LIMITS.favicon, BRAND_IMAGE_MIME_TYPES),
    ),
  )
  favicon(@UploadedFile() file: Express.Multer.File) {
    received();
    return { size: file.size };
  }
}

describe('image upload multipart limits', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UploadTestController],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => received.mockClear());

  it.each(['photo', 'logo', 'favicon'] as const)(
    'rejects %s exceeding its limit before reaching the handler',
    async (kind) => {
      await request(app.getHttpServer() as Server)
        .post('/upload-test/' + kind)
        .attach('file', Buffer.alloc(IMAGE_UPLOAD_LIMITS[kind] + 1), {
          filename: 'large.png',
          contentType: 'image/png',
        })
        .expect(413);
      expect(received).not.toHaveBeenCalled();
    },
  );

  it.each(['photo', 'logo', 'favicon'] as const)(
    'accepts %s below its limit',
    async (kind) => {
      await request(app.getHttpServer() as Server)
        .post('/upload-test/' + kind)
        .attach('file', Buffer.alloc(IMAGE_UPLOAD_LIMITS[kind] - 1), {
          filename: 'valid.png',
          contentType: 'image/png',
        })
        .expect(201);
      expect(received).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects SVG as a deceased photo', async () => {
    await request(app.getHttpServer() as Server)
      .post('/upload-test/photo')
      .attach('file', Buffer.from('<svg/>'), {
        filename: 'photo.svg',
        contentType: 'image/svg+xml',
      })
      .expect(400);
    expect(received).not.toHaveBeenCalled();
  });

  it('rejects extra files', async () => {
    await request(app.getHttpServer() as Server)
      .post('/upload-test/photo')
      .attach('file', Buffer.from('one'), {
        filename: 'one.png',
        contentType: 'image/png',
      })
      .attach('file', Buffer.from('two'), {
        filename: 'two.png',
        contentType: 'image/png',
      })
      .expect(400);
    expect(received).not.toHaveBeenCalled();
  });

  it('uses KB for the favicon limit instead of rounding to 1MB', () => {
    expect(() =>
      validateImageUpload(
        Buffer.alloc(IMAGE_UPLOAD_LIMITS.favicon + 1),
        IMAGE_UPLOAD_LIMITS.favicon,
      ),
    ).toThrow('El archivo excede el máximo de 512 KB');
  });

  it('rejects empty files at the service boundary', () => {
    expect(() =>
      validateImageUpload(Buffer.alloc(0), IMAGE_UPLOAD_LIMITS.photo),
    ).toThrow('El archivo está vacío');
  });
});
