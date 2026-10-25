import {
  Controller,
  INestApplication,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { Server } from 'http';
import * as request from 'supertest';
import { IMAGE_UPLOAD_LIMITS, PHOTO_MIME_TYPES } from '@zentic/shared-types';
import { FilesModule } from './files.module';
import { FilesService } from './files.service';
import { imageUploadOptions } from './image-upload.options';
import { DeceasedPhotoService } from '../obituary/services/deceased-photo.service';

// Explicit opt-in: uses a real Garage through an SSH tunnel. Never creates database records.
const describeGarage = process.env.GARAGE_INTEGRATION_ENDPOINT
  ? describe
  : describe.skip;

@Controller('integration/photos')
class PhotoUploadHarness {
  constructor(private readonly photos: DeceasedPhotoService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor(
      'file',
      imageUploadOptions(IMAGE_UPLOAD_LIMITS.photo, PHOTO_MIME_TYPES),
    ),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.photos.process('integration-test', file);
  }
}

describeGarage('Garage upload and display integration', () => {
  let app: INestApplication;
  let files: FilesService;
  const created: string[] = [];
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNQaDiAFTEMLQkAOsZYAYJCUNYAAAAASUVORK5CYII=',
    'base64',
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              STORAGE_PROVIDER: 's3',
              S3_ENDPOINT: process.env.GARAGE_INTEGRATION_ENDPOINT,
              S3_REGION: 'garage',
              S3_BUCKET: process.env.GARAGE_INTEGRATION_BUCKET,
              S3_ACCESS_KEY_ID: process.env.GARAGE_INTEGRATION_ACCESS_KEY,
              S3_SECRET_ACCESS_KEY: process.env.GARAGE_INTEGRATION_SECRET_KEY,
              STORAGE_PUBLIC_URL: 'https://homena.test/api/files/images',
            }),
          ],
        }),
        FilesModule,
      ],
      controllers: [PhotoUploadHarness],
      providers: [DeceasedPhotoService],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    files = app.get(FilesService);
  });

  afterAll(async () => {
    try {
      for (const url of created) await files.delete(url);
    } finally {
      await app?.close();
    }
  });

  it('uploads a photo, optimizes to WebP, serves it and reads it for server rendering', async () => {
    const uploaded = await request(app.getHttpServer() as Server)
      .post('/api/integration/photos')
      .attach('file', image, {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(201);
    const body = uploaded.body as { photoUrl: string };
    created.push(body.photoUrl);
    expect(body.photoUrl).toMatch(/^https:\/\/homena.test/);
    const result = await request(app.getHttpServer() as Server)
      .get(new URL(body.photoUrl).pathname)
      .expect('Content-Type', /image\/webp/)
      .expect(200);
    const content = await files.readLocalFile(body.photoUrl);
    expect(content).toEqual(result.body);
    expect(content!.byteLength).toBeLessThanOrEqual(1_000_000);
    expect(content!.subarray(8, 12).toString()).toBe('WEBP');
    await files.delete(body.photoUrl);
    await request(app.getHttpServer() as Server)
      .get(new URL(body.photoUrl).pathname)
      .expect(404);
  }, 30000);

  it('rejects an oversized original before writing to Garage', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/integration/photos')
      .attach('file', Buffer.alloc(IMAGE_UPLOAD_LIMITS.photo + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      })
      .expect(413);
  });
});
