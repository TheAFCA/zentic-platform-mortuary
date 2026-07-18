import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Deceased as DeceasedRecord,
  Event as EventRecord,
  EventStatus,
  MessageStatus,
  ObituaryMessage as ObituaryMessageRecord,
  ObituaryStatus,
} from '@prisma/client';
import { ObituaryService } from './obituary.service';
import {
  ObituaryRepository,
  ObituaryWithDeceased,
} from './obituary.repository';
import { DeceasedPhotoService } from './services/deceased-photo.service';
import { FilesService } from '../files/files.service';

describe('ObituaryService', () => {
  let service: ObituaryService;
  let obituaryRepo: jest.Mocked<ObituaryRepository>;
  let deceasedPhotoService: jest.Mocked<DeceasedPhotoService>;
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
    biography: '<p>Una vida plena</p>',
    epitaph: 'Con amor eterno',
    photoUrl: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

  const obituaryRecord = (
    overrides: Partial<ObituaryWithDeceased> = {},
  ): ObituaryWithDeceased => ({
    id: 'obituary-1',
    tenantId: TENANT_ID,
    deceasedId: 'deceased-1',
    eventId: null,
    slug: 'maria-lopez-a1b2',
    content: null,
    status: ObituaryStatus.DRAFT,
    isPublic: true,
    accessCode: null,
    publishedAt: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
    deceased: deceasedRecord(),
    ...overrides,
  });

  const eventRecord = (overrides: Partial<EventRecord> = {}): EventRecord =>
    ({
      id: 'event-1',
      tenantId: TENANT_ID,
      deceasedId: 'deceased-1',
      roomId: null,
      clientId: null,
      slug: 'velatorio-maria',
      streamKey: null,
      rtmpUrl: null,
      status: EventStatus.SCHEDULED,
      moderationMode: 'AUTO',
      recordingUrl: null,
      viewerCount: 0,
      isPublic: true,
      accessCode: null,
      scheduledAt: new Date('2026-07-02T00:00:00.000Z'),
      startedAt: null,
      finishedAt: null,
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      deletedAt: null,
      ...overrides,
    }) as EventRecord;

  const messageRecord = (
    overrides: Partial<ObituaryMessageRecord> = {},
  ): ObituaryMessageRecord => ({
    id: 'message-1',
    tenantId: TENANT_ID,
    obituaryId: 'obituary-1',
    authorName: 'Juan Pérez',
    content: 'Un abrazo enorme',
    iconType: null,
    status: MessageStatus.PENDING,
    rejectedReason: null,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-12T12:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObituaryService,
        {
          provide: ObituaryRepository,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            findBySlugPublic: jest.fn(),
            createWithDeceased: jest.fn(),
            update: jest.fn(),
            updatePhoto: jest.fn(),
            updateStatus: jest.fn(),
            softDelete: jest.fn(),
            findEventById: jest.fn(),
            listEventsForTenant: jest.fn(),
            findApprovedMessages: jest.fn(),
            createMessage: jest.fn(),
          },
        },
        {
          provide: DeceasedPhotoService,
          useValue: { process: jest.fn() },
        },
        {
          provide: FilesService,
          useValue: {
            upload: jest.fn(),
            delete: jest.fn(),
            readLocalFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ObituaryService);
    obituaryRepo = module.get(ObituaryRepository);
    deceasedPhotoService = module.get(DeceasedPhotoService);
    filesService = module.get(FilesService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('findAll', () => {
    it('paginates and maps results', async () => {
      obituaryRepo.findMany.mockResolvedValue({
        data: [obituaryRecord()],
        total: 1,
      });

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 25 });

      expect(obituaryRepo.findMany).toHaveBeenCalledWith(TENANT_ID, {
        status: undefined,
        search: undefined,
        page: 1,
        limit: 25,
      });
      expect(result.total).toBe(1);
      expect(result.data[0].slug).toBe('maria-lopez-a1b2');
    });
  });

  describe('findOne', () => {
    it('returns the mapped obituary', async () => {
      obituaryRepo.findById.mockResolvedValue(obituaryRecord());

      const result = await service.findOne(TENANT_ID, 'obituary-1');

      expect(result.id).toBe('obituary-1');
    });

    it('throws NotFoundException when missing', async () => {
      obituaryRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listAvailableEvents', () => {
    it('delegates to the repository', async () => {
      obituaryRepo.listEventsForTenant.mockResolvedValue([]);

      await service.listAvailableEvents(TENANT_ID);

      expect(obituaryRepo.listEventsForTenant).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  describe('create', () => {
    it('creates an obituary with a generated slug', async () => {
      obituaryRepo.createWithDeceased.mockResolvedValue(obituaryRecord());

      const result = await service.create(TENANT_ID, {
        firstName: 'María',
        lastName: 'López',
        deathDate: '2026-07-01',
      });

      expect(obituaryRepo.createWithDeceased).toHaveBeenCalledWith(
        TENANT_ID,
        expect.stringMatching(/^maria-lopez-[0-9a-f]{4}$/),
        expect.objectContaining({ firstName: 'María', lastName: 'López' }),
        expect.any(Object),
      );
      expect(result.slug).toBe('maria-lopez-a1b2');
    });

    it('sanitizes the biography before persisting', async () => {
      obituaryRepo.createWithDeceased.mockResolvedValue(obituaryRecord());

      await service.create(TENANT_ID, {
        firstName: 'María',
        lastName: 'López',
        biography: '<p>Hola</p><script>alert(1)</script>',
      });

      const [, , deceasedData] = obituaryRepo.createWithDeceased.mock.calls[0];
      expect(deceasedData.biography).toBe('<p>Hola</p>');
    });

    it('throws when death date is after today (RN-OBT-006)', async () => {
      await expect(
        service.create(TENANT_ID, {
          firstName: 'María',
          lastName: 'López',
          deathDate: '2026-07-13',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(obituaryRepo.createWithDeceased).not.toHaveBeenCalled();
    });

    it('throws when birth date is after death date (RN-OBT-007)', async () => {
      await expect(
        service.create(TENANT_ID, {
          firstName: 'María',
          lastName: 'López',
          birthDate: '2026-01-01',
          deathDate: '1990-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(obituaryRepo.createWithDeceased).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the linked event does not belong to the tenant', async () => {
      obituaryRepo.findEventById.mockResolvedValue(null);

      await expect(
        service.create(TENANT_ID, {
          firstName: 'María',
          lastName: 'López',
          eventId: 'event-999',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(obituaryRepo.createWithDeceased).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('never sends the slug to the repository (RN-OBT-004: slug inmutable)', async () => {
      obituaryRepo.findById.mockResolvedValue(obituaryRecord());
      obituaryRepo.update.mockResolvedValue(undefined);

      await service.update(TENANT_ID, 'obituary-1', { firstName: 'Ana' });

      const [, , , , obituaryData] = obituaryRepo.update.mock.calls[0];
      expect(obituaryData).not.toHaveProperty('slug');
    });

    it('throws NotFoundException when the obituary does not exist', async () => {
      obituaryRepo.findById.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'missing', { firstName: 'Ana' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('validates dates using existing values when not provided in the payload', async () => {
      obituaryRepo.findById.mockResolvedValue(
        obituaryRecord({
          deceased: deceasedRecord({ deathDate: new Date('1990-01-01') }),
        }),
      );

      await expect(
        service.update(TENANT_ID, 'obituary-1', { birthDate: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('publish', () => {
    it('publishes when required fields are present', async () => {
      obituaryRepo.findById
        .mockResolvedValueOnce(obituaryRecord())
        .mockResolvedValueOnce(
          obituaryRecord({ status: ObituaryStatus.PUBLISHED }),
        );

      const result = await service.publish(TENANT_ID, 'obituary-1');

      expect(obituaryRepo.updateStatus).toHaveBeenCalledWith(
        TENANT_ID,
        'obituary-1',
        ObituaryStatus.PUBLISHED,
        expect.any(Date),
      );
      expect(result.status).toBe(ObituaryStatus.PUBLISHED);
    });

    it('throws with a literal message when deathDate is missing', async () => {
      obituaryRepo.findById.mockResolvedValue(
        obituaryRecord({ deceased: deceasedRecord({ deathDate: null }) }),
      );

      await expect(service.publish(TENANT_ID, 'obituary-1')).rejects.toThrow(
        'Completa los campos requeridos antes de publicar: Fecha de fallecimiento',
      );
      expect(obituaryRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('unpublish', () => {
    it('resets status to DRAFT and clears publishedAt without deleting data', async () => {
      obituaryRepo.findById
        .mockResolvedValueOnce(
          obituaryRecord({ status: ObituaryStatus.PUBLISHED }),
        )
        .mockResolvedValueOnce(
          obituaryRecord({ status: ObituaryStatus.DRAFT }),
        );

      const result = await service.unpublish(TENANT_ID, 'obituary-1');

      expect(obituaryRepo.updateStatus).toHaveBeenCalledWith(
        TENANT_ID,
        'obituary-1',
        ObituaryStatus.DRAFT,
        null,
      );
      expect(result.status).toBe(ObituaryStatus.DRAFT);
    });
  });

  describe('remove', () => {
    it('soft deletes an existing obituary', async () => {
      obituaryRepo.findById.mockResolvedValue(obituaryRecord());

      await service.remove(TENANT_ID, 'obituary-1');

      expect(obituaryRepo.softDelete).toHaveBeenCalledWith(
        TENANT_ID,
        'obituary-1',
      );
    });

    it('throws NotFoundException for a missing obituary', async () => {
      obituaryRepo.findById.mockResolvedValue(null);

      await expect(service.remove(TENANT_ID, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findPublic', () => {
    it('throws NotFoundException when no published obituary matches the slug', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(null);

      await expect(
        service.findPublic(TENANT_ID, 'unknown-slug'),
      ).rejects.toThrow(NotFoundException);
    });

    it('resolves streamingAction as LIVE when the linked event is live', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(
        obituaryRecord({
          eventId: 'event-1',
          status: ObituaryStatus.PUBLISHED,
        }),
      );
      obituaryRepo.findEventById.mockResolvedValue(
        eventRecord({ status: EventStatus.LIVE }),
      );
      obituaryRepo.findApprovedMessages.mockResolvedValue([]);

      const result = await service.findPublic(TENANT_ID, 'maria-lopez-a1b2');

      expect(result.streamingAction).toBe('LIVE');
    });

    it('resolves streamingAction as RECORDING when finished with a recording url', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(
        obituaryRecord({
          eventId: 'event-1',
          status: ObituaryStatus.PUBLISHED,
        }),
      );
      obituaryRepo.findEventById.mockResolvedValue(
        eventRecord({
          status: EventStatus.FINISHED,
          recordingUrl: 'https://example.com/rec.mp4',
        }),
      );
      obituaryRepo.findApprovedMessages.mockResolvedValue([]);

      const result = await service.findPublic(TENANT_ID, 'maria-lopez-a1b2');

      expect(result.streamingAction).toBe('RECORDING');
    });

    it('resolves streamingAction as null when the event is only scheduled', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(
        obituaryRecord({
          eventId: 'event-1',
          status: ObituaryStatus.PUBLISHED,
        }),
      );
      obituaryRepo.findEventById.mockResolvedValue(
        eventRecord({ status: EventStatus.SCHEDULED }),
      );
      obituaryRepo.findApprovedMessages.mockResolvedValue([]);

      const result = await service.findPublic(TENANT_ID, 'maria-lopez-a1b2');

      expect(result.streamingAction).toBeNull();
      expect(result.event).toEqual({
        slug: 'velatorio-maria',
        status: EventStatus.SCHEDULED,
      });
    });

    it('resolves streamingAction as null when there is no linked event', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(
        obituaryRecord({ eventId: null, status: ObituaryStatus.PUBLISHED }),
      );
      obituaryRepo.findApprovedMessages.mockResolvedValue([]);

      const result = await service.findPublic(TENANT_ID, 'maria-lopez-a1b2');

      expect(result.streamingAction).toBeNull();
      expect(result.event).toBeNull();
    });

    it('gates the whole page when isPublic=false and no access code is given', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(
        obituaryRecord({
          status: ObituaryStatus.PUBLISHED,
          isPublic: false,
          accessCode: 'secret',
        }),
      );

      const result = await service.findPublic(TENANT_ID, 'maria-lopez-a1b2');

      expect(result.accessGranted).toBe(false);
      expect(result.deceased).toBeNull();
      expect(obituaryRepo.findApprovedMessages).not.toHaveBeenCalled();
    });

    it('gates the whole page when the access code is wrong', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(
        obituaryRecord({
          status: ObituaryStatus.PUBLISHED,
          isPublic: false,
          accessCode: 'secret',
        }),
      );

      const result = await service.findPublic(
        TENANT_ID,
        'maria-lopez-a1b2',
        'wrong',
      );

      expect(result.accessGranted).toBe(false);
      expect(result.deceased).toBeNull();
    });

    it('grants access and returns full content with the correct access code', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(
        obituaryRecord({
          status: ObituaryStatus.PUBLISHED,
          isPublic: false,
          accessCode: 'secret',
        }),
      );
      obituaryRepo.findApprovedMessages.mockResolvedValue([]);

      const result = await service.findPublic(
        TENANT_ID,
        'maria-lopez-a1b2',
        'secret',
      );

      expect(result.accessGranted).toBe(true);
      expect(result.deceased).not.toBeNull();
    });
  });

  describe('submitMessage', () => {
    it('rejects a message with an invalid access code for a private obituary', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(
        obituaryRecord({ isPublic: false, accessCode: 'secret' }),
      );

      await expect(
        service.submitMessage(TENANT_ID, 'maria-lopez-a1b2', {
          authorName: 'Juan',
          content: 'Hola',
          accessCode: 'wrong',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(obituaryRepo.createMessage).not.toHaveBeenCalled();
    });

    it('accepts a message with the correct access code', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(
        obituaryRecord({ isPublic: false, accessCode: 'secret' }),
      );
      obituaryRepo.createMessage.mockResolvedValue(messageRecord());

      await service.submitMessage(TENANT_ID, 'maria-lopez-a1b2', {
        authorName: 'Juan',
        content: 'Hola',
        accessCode: 'secret',
      });

      expect(obituaryRepo.createMessage).toHaveBeenCalledWith(
        TENANT_ID,
        'obituary-1',
        {
          authorName: 'Juan',
          content: 'Hola',
          iconType: undefined,
        },
      );
    });

    it('throws NotFoundException when the obituary is not published', async () => {
      obituaryRepo.findBySlugPublic.mockResolvedValue(null);

      await expect(
        service.submitMessage(TENANT_ID, 'missing', {
          authorName: 'Juan',
          content: 'Hola',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadPhoto', () => {
    it('replaces the previous photo and deletes the old file', async () => {
      obituaryRepo.findById
        .mockResolvedValueOnce(
          obituaryRecord({
            deceased: deceasedRecord({
              photoUrl: 'http://old.example/photo.webp',
            }),
          }),
        )
        .mockResolvedValueOnce(
          obituaryRecord({
            deceased: deceasedRecord({
              photoUrl: 'http://new.example/photo.webp',
            }),
          }),
        );
      deceasedPhotoService.process.mockResolvedValue({
        photoUrl: 'http://new.example/photo.webp',
        lowResolutionWarning: false,
      });

      const file = {
        buffer: Buffer.from(''),
        mimetype: 'image/png',
        originalname: 'photo.png',
      };
      const result = await service.uploadPhoto(TENANT_ID, 'obituary-1', file);

      expect(obituaryRepo.updatePhoto).toHaveBeenCalledWith(
        TENANT_ID,
        'deceased-1',
        'http://new.example/photo.webp',
      );
      expect(filesService.delete).toHaveBeenCalledWith(
        'http://old.example/photo.webp',
      );
      expect(result.lowResolutionWarning).toBe(false);
    });

    it('throws NotFoundException for a missing obituary', async () => {
      obituaryRepo.findById.mockResolvedValue(null);

      await expect(
        service.uploadPhoto(TENANT_ID, 'missing', {
          buffer: Buffer.from(''),
          mimetype: 'image/png',
          originalname: 'photo.png',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
