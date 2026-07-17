import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// Sin esModuleInterop en tsconfig, el default import de supertest resuelve a `.default`
// (undefined) en runtime — igual que sanitize-html en obituary.service.ts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { App } from 'supertest/types';
import { UserRole } from '@zentic/shared-types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * Cubre el flujo crítico de HU9 de punta a punta: crear invitación → publicar (con el gate de
 * RN-INV-001) → vista pública sin auth → generación de imagen → cascada de archivado RN-INV-002
 * al cancelar el evento. No existe infraestructura de fixtures de e2e en el repo todavía — este
 * spec siembra sus propios datos directamente vía PrismaService y firma un JWT sin pasar por el
 * endpoint de login (atajo razonable dado que es el primer e2e de este estilo en el módulo).
 */
describe('Invitations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let tenantId: string;
  let tenantSlug: string;
  let authToken: string;
  let eventId: string;
  let roomId: string;
  let invitationId: string;
  let publicUrl: string;

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
    tenantSlug = `e2e-invitations-${uniqueSuffix}`;
    const tenant = await prisma.tenant.create({
      data: { slug: tenantSlug, name: 'Funeraria E2E Invitaciones' },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        email: `operador-invitaciones-${uniqueSuffix}@example.com`,
        passwordHash: 'not-used-in-this-test',
        tenantId,
        // TENANT_ADMIN bypassa PermissionGuard — evita tener que sembrar UserPermission rows.
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

    const venue = await prisma.venue.create({
      data: { tenantId, name: 'Sede Norte', address: 'Calle 45 #23-10' },
    });
    const room = await prisma.room.create({
      data: { tenantId, venueId: venue.id, name: 'Sala A' },
    });
    roomId = room.id;

    // Sin roomId todavía: el siguiente test de RN-INV-001 depende de que el evento no tenga
    // sala asignada al momento de crear/publicar la primera invitación.
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
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({ where: { tenantId } });
    await prisma.event.deleteMany({ where: { tenantId } });
    await prisma.room.deleteMany({ where: { tenantId } });
    await prisma.venue.deleteMany({ where: { tenantId } });
    await prisma.deceased.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  it('POST /api/invitations creates a DRAFT invitation', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/invitations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eventId, message: 'La familia López invita a acompañarlos' })
      .expect(201);

    expect(body.status).toBe('DRAFT');
    expect(body.eventId).toBe(eventId);
    expect(body.publicUrl).toBeNull();
    invitationId = body.id;
  });

  it('POST /api/invitations/:id/publish rejects when the event has no room (RN-INV-001)', async () => {
    const { body } = await request(app.getHttpServer())
      .post(`/api/invitations/${invitationId}/publish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(body.message).toMatch(/sala|lugar/i);
  });

  it('POST /api/invitations/:id/publish succeeds once the event has a room assigned', async () => {
    await prisma.event.update({ where: { id: eventId }, data: { roomId } });

    const { body } = await request(app.getHttpServer())
      .post(`/api/invitations/${invitationId}/publish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(body.status).toBe('PUBLISHED');
    expect(body.publicUrl).toMatch(/^invitacion-maria-lopez-/);
    publicUrl = body.publicUrl;
  });

  it('GET /api/invitations/:publicUrl/public resolves without authentication', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/api/invitations/${publicUrl}/public`)
      .set('x-tenant-slug', tenantSlug)
      .expect(200);

    expect(body.deceased.firstName).toBe('María');
    expect(body.event.place.venueName).toBe('Sede Norte');
    expect(body.event.hasAccessCode).toBe(false);
  });

  it('POST /api/invitations/:id/image returns a PNG buffer and persists imageUrl', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/invitations/${invitationId}/image`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(response.headers['content-type']).toContain('image/png');
    expect(response.body.length).toBeGreaterThan(0);

    const { body } = await request(app.getHttpServer())
      .get(`/api/invitations/${invitationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(typeof body.imageUrl).toBe('string');
  }, 15000);

  it('DELETE /api/events/:id archives the invitation (RN-INV-002) and the public page keeps resolving', async () => {
    await request(app.getHttpServer())
      .delete(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const { body } = await request(app.getHttpServer())
      .get(`/api/invitations/${invitationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(body.status).toBe('ARCHIVED');

    // RN-INV-003: el enlace permanece activo aunque el evento haya sido cancelado.
    const { body: publicBody } = await request(app.getHttpServer())
      .get(`/api/invitations/${publicUrl}/public`)
      .set('x-tenant-slug', tenantSlug)
      .expect(200);
    expect(publicBody.status).toBe('ARCHIVED');
    expect(publicBody.event.status).toBe('CANCELLED');
  });
});
