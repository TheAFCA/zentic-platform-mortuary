import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// Sin esModuleInterop en tsconfig, el default import de supertest resuelve a `.default`
// (undefined) en runtime — mismo patrón que en invitations.e2e-spec.ts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { App } from 'supertest/types';
import { MessageStatus, UserRole } from '@zentic/shared-types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface MessageRow {
  id: string;
}

interface GenerationRow {
  id: string;
  status: string;
  errorMessage: string | null;
}

/**
 * Cubre el flujo crítico de HU-TRIB de punta a punta: listado centralizado de mensajes de
 * streaming → moderación individual → generación asíncrona del libro (fire-and-forget, se
 * espera el flip PROCESSING→READY por polling real, sin mocks) → descarga → papelera con
 * restauración. No existe infraestructura de fixtures de e2e en el repo — este spec siembra
 * sus propios datos vía PrismaService, siguiendo el mismo patrón que invitations.e2e-spec.ts.
 */
describe('Tribute Book (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let tenantId: string;
  let authToken: string;
  let eventId: string;
  let approvedMessageId: string;
  let pendingMessageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    const jwtService = moduleFixture.get(JwtService);

    const uniqueSuffix = Date.now();
    const tenant = await prisma.tenant.create({
      data: {
        slug: `e2e-tribute-book-${uniqueSuffix}`,
        name: 'Funeraria E2E Libro de Homenajes',
      },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        email: `operador-tribute-book-${uniqueSuffix}@example.com`,
        passwordHash: 'not-used-in-this-test',
        tenantId,
        // TENANT_ADMIN bypassa PermissionGuard — evita sembrar UserPermission rows.
        role: UserRole.TENANT_ADMIN,
      },
    });

    authToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: UserRole.TENANT_ADMIN,
      tenantId,
      permissions: [],
    });

    const deceased = await prisma.deceased.create({
      data: {
        tenantId,
        firstName: 'María',
        lastName: 'López',
        deathDate: new Date('2026-07-01T00:00:00.000Z'),
      },
    });

    const event = await prisma.event.create({
      data: {
        tenantId,
        deceasedId: deceased.id,
        title: 'Velatorio de María López',
        slug: `velatorio-maria-lopez-${uniqueSuffix}`,
        scheduledAt: new Date('2026-07-05T19:00:00.000Z'),
      },
    });
    eventId = event.id;

    const approvedMessage = await prisma.message.create({
      data: {
        tenantId,
        eventId,
        authorName: 'Ana Gómez',
        content: 'Que en paz descanse',
        status: MessageStatus.APPROVED,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });
    approvedMessageId = approvedMessage.id;

    const pendingMessage = await prisma.message.create({
      data: {
        tenantId,
        eventId,
        authorName: 'Juan Pérez',
        content: 'Descansa en paz, María',
      },
    });
    pendingMessageId = pendingMessage.id;
  });

  afterAll(async () => {
    await prisma.tributeBookGeneration.deleteMany({ where: { tenantId } });
    await prisma.message.deleteMany({ where: { tenantId } });
    await prisma.event.deleteMany({ where: { tenantId } });
    await prisma.deceased.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  it('GET /api/tribute-book/messages lists the pending and approved messages for the event', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/api/tribute-book/messages?eventId=${eventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(body.total).toBe(2);
    const ids = (body.data as MessageRow[]).map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining([approvedMessageId, pendingMessageId]),
    );
  });

  it('GET /api/tribute-book/messages/pending-count reflects the seeded pending message', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/tribute-book/messages/pending-count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(body.count).toBe(1);
  });

  it('PATCH /api/tribute-book/messages/:id/approve moderates the pending message (HU-TRIB-001)', async () => {
    const { body } = await request(app.getHttpServer())
      .patch(`/api/tribute-book/messages/${pendingMessageId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ origin: 'STREAMING' })
      .expect(200);

    expect(body.status).toBe('APPROVED');

    const { body: countBody } = await request(app.getHttpServer())
      .get('/api/tribute-book/messages/pending-count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(countBody.count).toBe(0);
  });

  it('POST /api/tribute-book/generate + history + download completes the async flow (HU-TRIB-002)', async () => {
    const { body: generation } = await request(app.getHttpServer())
      .post('/api/tribute-book/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventId })
      .expect(201);

    expect(generation.status).toBe('PROCESSING');
    expect(generation.messageCount).toBe(2);

    let ready = false;
    for (let attempt = 0; attempt < 20 && !ready; attempt += 1) {
      await sleep(250);
      const { body: history } = await request(app.getHttpServer())
        .get('/api/tribute-book/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const row = (history.data as GenerationRow[]).find(
        (g) => g.id === generation.id,
      );
      if (row?.status === 'READY') ready = true;
      else if (row?.status === 'ERROR') {
        throw new Error(`Generation failed: ${row.errorMessage ?? 'unknown'}`);
      }
    }
    expect(ready).toBe(true);

    const download = await request(app.getHttpServer())
      .get(`/api/tribute-book/${generation.id}/download`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const pdfBuffer = download.body as Buffer;
    expect(download.headers['content-type']).toBe('application/pdf');
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  }, 15000);

  it('DELETE + restore moves a message to the trash and back (RN-TRIB-003)', async () => {
    await request(app.getHttpServer())
      .delete(
        `/api/tribute-book/messages/${approvedMessageId}?origin=STREAMING`,
      )
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const { body: trash } = await request(app.getHttpServer())
      .get(`/api/tribute-book/messages?eventId=${eventId}&trashed=true`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect((trash.data as MessageRow[]).map((m) => m.id)).toContain(
      approvedMessageId,
    );

    await request(app.getHttpServer())
      .post(
        `/api/tribute-book/messages/${approvedMessageId}/restore?origin=STREAMING`,
      )
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const { body: active } = await request(app.getHttpServer())
      .get(`/api/tribute-book/messages?eventId=${eventId}&trashed=false`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect((active.data as MessageRow[]).map((m) => m.id)).toContain(
      approvedMessageId,
    );
  });
});
