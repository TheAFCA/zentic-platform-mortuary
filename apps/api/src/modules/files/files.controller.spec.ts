import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import helmet from 'helmet';
import * as request from 'supertest';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

describe('Public image response headers', () => {
  let app: INestApplication;
  const files = { readPublicImage: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [{ provide: FilesService, useValue: files }],
    }).compile();
    app = module.createNestApplication();
    // Reproduce the production Helmet middleware that defaults to same-origin.
    app.use(helmet());
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => files.readPublicImage.mockReset());

  it('allows a tenant page to embed an image served from the app subdomain', async () => {
    files.readPublicImage.mockResolvedValue({
      buffer: Buffer.from('webp'),
      contentType: 'image/webp',
    });
    await request(app.getHttpServer() as Server)
      .get(
        '/api/files/images/deceased/tenant-1/12345678-1234-1234-1234-123456789abc.webp',
      )
      .set('Origin', 'https://demo-funeraria.zentic.pro')
      .expect(200)
      .expect('Content-Type', /image\/webp/)
      .expect('Cross-Origin-Resource-Policy', 'cross-origin')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('Content-Security-Policy', "default-src 'none'; sandbox");
  });

  it('retains the default policy for missing images', async () => {
    files.readPublicImage.mockResolvedValue(null);
    await request(app.getHttpServer() as Server)
      .get('/api/files/images/deceased/tenant-1/missing.webp')
      .expect(404)
      .expect('Cross-Origin-Resource-Policy', 'same-origin');
  });
});
