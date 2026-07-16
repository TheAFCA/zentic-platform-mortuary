import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  Deceased as DeceasedRecord,
  Event as EventRecord,
  Invitation as InvitationRecord,
  Room,
  TenantBrandConfig,
  Venue,
} from '@prisma/client';
import { InvitationTemplate } from '@zentic/shared-types';
import { InvitationsService } from './invitations.service';
import {
  EventForInvitation,
  InvitationsRepository,
} from './invitations.repository';
import { InvitationImageService } from './services/invitation-image.service';
import { FilesService } from '../files/files.service';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationsRepo: jest.Mocked<InvitationsRepository>;
  let invitationImageService: jest.Mocked<InvitationImageService>;
  let filesService: jest.Mocked<FilesService>;

  const TENANT_ID = 'tenant-1';

  const deceasedRecord = (
    overrides: Partial<DeceasedRecord> = {},
  ): DeceasedRecord => ({
    id: 'deceased-1',
    tenantId: TENANT_ID,
    firstName: 'María',
    lastName: 'López',
    birthDate: new Date('1945-03-15T00:00:00.000Z'),
    deathDate: new Date('2026-07-01T00:00:00.000Z'),
    birthCity: 'Bogotá',
    deathCity: 'Bogotá',
    biography: null,
    epitaph: null,
    photoUrl: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

  const venueRecord = (overrides: Partial<Venue> = {}): Venue => ({
    id: 'venue-1',
    tenantId: TENANT_ID,
    name: 'Sede Norte',
    address: 'Calle 45 #23-10',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

  const roomRecord = (
    overrides: Partial<Room> = {},
  ): Room & { venue: Venue } => ({
    id: 'room-1',
    tenantId: TENANT_ID,
    venueId: 'venue-1',
    name: 'Sala A',
    capacity: 40,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
    venue: venueRecord(),
    ...overrides,
  });

  const brandConfigRecord = (
    overrides: Partial<TenantBrandConfig> = {},
  ): TenantBrandConfig => ({
    id: 'brand-1',
    tenantId: TENANT_ID,
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#1a1a2e',
    secondaryColor: '#16213e',
    textColor: '#333333',
    backgroundColor: '#f5f5f5',
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  });

  const eventForInvitation = (
    overrides: Partial<EventForInvitation> = {},
  ): EventForInvitation =>
    ({
      id: 'event-1',
      tenantId: TENANT_ID,
      deceasedId: 'deceased-1',
      roomId: 'room-1',
      clientId: null,
      assignedToId: null,
      title: 'Velatorio de María López',
      slug: 'velatorio-maria-lopez',
      description: null,
      ceremonyType: 'VELATORIO',
      estimatedDuration: null,
      streamKey: null,
      rtmpUrl: null,
      status: 'SCHEDULED',
      moderationMode: 'AUTO',
      recordingUrl: null,
      recordingExpiry: null,
      viewerCount: 0,
      isPublic: true,
      accessCode: null,
      scheduledAt: new Date('2026-07-05T19:00:00.000Z'),
      startedAt: null,
      finishedAt: null,
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      deletedAt: null,
      deceased: deceasedRecord(),
      room: roomRecord(),
      tenant: { name: 'Funeraria XYZ', brandConfig: brandConfigRecord() },
      ...overrides,
    }) as EventForInvitation;

  const invitationRecord = (
    overrides: Partial<InvitationRecord> = {},
  ): InvitationRecord => ({
    id: 'invitation-1',
    tenantId: TENANT_ID,
    eventId: 'event-1',
    template: InvitationTemplate.CLASSIC,
    status: 'DRAFT',
    message: 'La familia López invita a acompañarlos',
    publicUrl: null,
    imageUrl: null,
    accessCodeDisplay: null,
    publishedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    invitationsRepo = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByPublicUrl: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      updateImageUrl: jest.fn(),
      archiveByEventId: jest.fn(),
      findEventForInvitation: jest.fn(),
      findEventForInvitationRender: jest.fn(),
    } as unknown as jest.Mocked<InvitationsRepository>;

    invitationImageService = {
      renderSocial: jest.fn(),
      renderChatPreview: jest.fn(),
      toDataUri: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<InvitationImageService>;

    filesService = {
      upload: jest
        .fn()
        .mockResolvedValue(
          'http://localhost:3000/uploads/invitations/tenant-1/chat.png',
        ),
    } as unknown as jest.Mocked<FilesService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: InvitationsRepository, useValue: invitationsRepo },
        { provide: InvitationImageService, useValue: invitationImageService },
        { provide: FilesService, useValue: filesService },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  describe('create', () => {
    it('creates a DRAFT invitation linked to an existing event', async () => {
      invitationsRepo.findEventForInvitation.mockResolvedValue(
        eventForInvitation(),
      );
      invitationsRepo.create.mockResolvedValue(invitationRecord());

      const result = await service.create(
        TENANT_ID,
        { eventId: 'event-1', message: 'Hola' },
        'user-1',
      );

      expect(result.status).toBe('DRAFT');
      expect(invitationsRepo.create).toHaveBeenCalledWith(
        TENANT_ID,
        'user-1',
        expect.objectContaining({ eventId: 'event-1' }),
      );
    });

    it('throws NotFoundException when the event does not exist', async () => {
      invitationsRepo.findEventForInvitation.mockResolvedValue(null);

      await expect(
        service.create(TENANT_ID, { eventId: 'missing' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates a DRAFT invitation', async () => {
      invitationsRepo.findById
        .mockResolvedValueOnce(invitationRecord())
        .mockResolvedValueOnce(invitationRecord({ message: 'Nuevo mensaje' }));

      const result = await service.update(TENANT_ID, 'invitation-1', {
        message: 'Nuevo mensaje',
      });

      expect(result.message).toBe('Nuevo mensaje');
    });

    it('throws BadRequestException when the invitation is ARCHIVED', async () => {
      invitationsRepo.findById.mockResolvedValue(
        invitationRecord({ status: 'ARCHIVED' }),
      );

      await expect(
        service.update(TENANT_ID, 'invitation-1', { message: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(invitationsRepo.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the invitation does not exist', async () => {
      invitationsRepo.findById.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'missing', { message: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('publishes a DRAFT invitation when the event has a room assigned', async () => {
      invitationsRepo.findById
        .mockResolvedValueOnce(invitationRecord())
        .mockResolvedValueOnce(
          invitationRecord({
            status: 'PUBLISHED',
            publicUrl: 'invitacion-maria-lopez-x7k2',
            publishedAt: new Date(),
          }),
        );
      invitationsRepo.findEventForInvitation.mockResolvedValue(
        eventForInvitation(),
      );

      const result = await service.publish(TENANT_ID, 'invitation-1');

      expect(result.status).toBe('PUBLISHED');
      expect(invitationsRepo.updateStatus).toHaveBeenCalledWith(
        TENANT_ID,
        'invitation-1',
        'PUBLISHED',
        expect.any(Date),
        expect.stringMatching(/^invitacion-maria-lopez-/),
      );
    });

    it('throws BadRequestException when the event has no room assigned (RN-INV-001)', async () => {
      invitationsRepo.findById.mockResolvedValue(invitationRecord());
      invitationsRepo.findEventForInvitation.mockResolvedValue(
        eventForInvitation({ roomId: null, room: null }),
      );

      await expect(service.publish(TENANT_ID, 'invitation-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(invitationsRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('is idempotent when the invitation is already PUBLISHED', async () => {
      invitationsRepo.findById.mockResolvedValue(
        invitationRecord({ status: 'PUBLISHED', publicUrl: 'existing-slug' }),
      );

      const result = await service.publish(TENANT_ID, 'invitation-1');

      expect(result.publicUrl).toBe('existing-slug');
      expect(invitationsRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the invitation is ARCHIVED', async () => {
      invitationsRepo.findById.mockResolvedValue(
        invitationRecord({ status: 'ARCHIVED' }),
      );

      await expect(service.publish(TENANT_ID, 'invitation-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when the linked event is no longer available', async () => {
      invitationsRepo.findById.mockResolvedValue(invitationRecord());
      invitationsRepo.findEventForInvitation.mockResolvedValue(null);

      await expect(service.publish(TENANT_ID, 'invitation-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findPublic', () => {
    it('resolves a PUBLISHED invitation', async () => {
      invitationsRepo.findByPublicUrl.mockResolvedValue(
        invitationRecord({ status: 'PUBLISHED', publicUrl: 'slug-1' }),
      );
      invitationsRepo.findEventForInvitationRender.mockResolvedValue(
        eventForInvitation(),
      );

      const result = await service.findPublic(TENANT_ID, 'slug-1');

      expect(result.status).toBe('PUBLISHED');
      expect(result.deceased.firstName).toBe('María');
    });

    it('resolves an ARCHIVED invitation (RN-INV-002/003: el enlace sigue activo)', async () => {
      invitationsRepo.findByPublicUrl.mockResolvedValue(
        invitationRecord({ status: 'ARCHIVED', publicUrl: 'slug-1' }),
      );
      invitationsRepo.findEventForInvitationRender.mockResolvedValue(
        eventForInvitation({ status: 'CANCELLED', deletedAt: new Date() }),
      );

      const result = await service.findPublic(TENANT_ID, 'slug-1');

      expect(result.status).toBe('ARCHIVED');
      expect(result.event.status).toBe('CANCELLED');
    });

    it('throws NotFoundException for a DRAFT/unknown publicUrl', async () => {
      invitationsRepo.findByPublicUrl.mockResolvedValue(null);

      await expect(
        service.findPublic(TENANT_ID, 'missing-slug'),
      ).rejects.toThrow(NotFoundException);
    });

    it('exposes hasAccessCode=true only when the event has an access code (RN-INV-004)', async () => {
      invitationsRepo.findByPublicUrl.mockResolvedValue(
        invitationRecord({
          status: 'PUBLISHED',
          publicUrl: 'slug-1',
          accessCodeDisplay: 'FAMILIA2026',
        }),
      );
      invitationsRepo.findEventForInvitationRender.mockResolvedValue(
        eventForInvitation({ accessCode: 'hashed-code' }),
      );

      const result = await service.findPublic(TENANT_ID, 'slug-1');

      expect(result.event.hasAccessCode).toBe(true);
      expect(result.accessCodeDisplay).toBe('FAMILIA2026');
    });

    it('hides accessCodeDisplay when the event has no access code enabled', async () => {
      invitationsRepo.findByPublicUrl.mockResolvedValue(
        invitationRecord({
          status: 'PUBLISHED',
          publicUrl: 'slug-1',
          accessCodeDisplay: 'STALE-VALUE',
        }),
      );
      invitationsRepo.findEventForInvitationRender.mockResolvedValue(
        eventForInvitation({ accessCode: null }),
      );

      const result = await service.findPublic(TENANT_ID, 'slug-1');

      expect(result.event.hasAccessCode).toBe(false);
      expect(result.accessCodeDisplay).toBeNull();
    });
  });

  describe('generateImage', () => {
    beforeEach(() => {
      invitationsRepo.findById.mockResolvedValue(invitationRecord());
      invitationsRepo.findEventForInvitationRender.mockResolvedValue(
        eventForInvitation(),
      );
    });

    it('returns the social PNG buffer and persists the chat preview as imageUrl', async () => {
      const socialBuffer = Buffer.from('social-png');
      const chatBuffer = Buffer.from('chat-png');
      invitationImageService.renderSocial.mockResolvedValue(socialBuffer);
      invitationImageService.renderChatPreview.mockResolvedValue(chatBuffer);

      const result = await service.generateImage(TENANT_ID, 'invitation-1');

      expect(result.buffer).toBe(socialBuffer);
      expect(result.filename).toMatch(/^invitacion-maria-lopez-2026\.png$/);
      expect(filesService.upload).toHaveBeenCalled();
      expect(invitationsRepo.updateImageUrl).toHaveBeenCalledWith(
        TENANT_ID,
        'invitation-1',
        expect.any(String),
      );
    });

    it('still returns the social buffer when the chat preview upload fails', async () => {
      const socialBuffer = Buffer.from('social-png');
      invitationImageService.renderSocial.mockResolvedValue(socialBuffer);
      invitationImageService.renderChatPreview.mockRejectedValue(
        new Error('timeout'),
      );

      const result = await service.generateImage(TENANT_ID, 'invitation-1');

      expect(result.buffer).toBe(socialBuffer);
      expect(invitationsRepo.updateImageUrl).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the social render fails, even if chat succeeds', async () => {
      invitationImageService.renderChatPreview.mockResolvedValue(
        Buffer.from('chat-png'),
      );
      invitationImageService.renderSocial.mockRejectedValue(
        new Error('timeout'),
      );

      await expect(
        service.generateImage(TENANT_ID, 'invitation-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the linked event is no longer available', async () => {
      invitationsRepo.findEventForInvitationRender.mockResolvedValue(null);

      await expect(
        service.generateImage(TENANT_ID, 'invitation-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('archiveByEventId', () => {
    it('delegates to the repository (invoked from StreamingService on event cancellation)', async () => {
      await service.archiveByEventId(TENANT_ID, 'event-1');

      expect(invitationsRepo.archiveByEventId).toHaveBeenCalledWith(
        TENANT_ID,
        'event-1',
      );
    });
  });
});
