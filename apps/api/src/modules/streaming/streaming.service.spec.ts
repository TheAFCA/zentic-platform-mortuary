import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventStatus, ModerationMode } from '@zentic/shared-types';
import { StreamingService } from './streaming.service';
import { StreamingRepository } from './streaming.repository';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { EmailService } from '../email/email.service';
import {
  StreamProvider,
  STREAM_PROVIDER_TOKEN,
} from './providers/stream-provider.interface';
import { MuxStreamProvider } from './providers/mux-stream.provider';
import { CloudflareStreamProvider } from './providers/cloudflare-stream.provider';
import {
  CreateEventDto,
  SendMessageDto,
  SendReactionDto,
  AccessCodeDto,
} from './dto';

describe('StreamingService', () => {
  let service: StreamingService;
  let mockRepo: jest.Mocked<StreamingRepository>;
  let mockGateway: jest.Mocked<NotificationsGateway> & {
    server: { to: jest.Mock; emit: jest.Mock };
  };
  let mockConfig: jest.Mocked<ConfigService>;
  let mockProvider: jest.Mocked<StreamProvider>;
  let mockMuxProvider: jest.Mocked<MuxStreamProvider>;
  let mockCloudflareProvider: jest.Mocked<CloudflareStreamProvider>;
  let mockEmailService: jest.Mocked<EmailService>;
  let randomBytesSpy: jest.SpyInstance;

  const tenantId = 'tenant-1';
  const eventId = 'event-1';
  const messageId = 'message-1';
  const deceasedId = 'deceased-1';

  const baseEvent = {
    id: eventId,
    title: 'Test Event',
    slug: 'test-event-abababab',
    status: 'SCHEDULED' as const,
    ceremonyType: 'VELATORIO',
    description: 'A test event description',
    scheduledAt: new Date('2026-07-15T10:00:00Z'),
    startedAt: null as Date | null,
    finishedAt: null as Date | null,
    recordingUrl: null as string | null,
    isPublic: true,
    viewerCount: 0,
    streamKey: 'zentic_abababababababababababab',
    rtmpUrl: 'rtmps://global-live.mux.com:443/app',
    accessCode: 'hashed-access-code',
    moderationMode: 'AUTO' as const,
    estimatedDuration: 120,
    deletedAt: null as Date | null,
    tenantId,
    deceasedId,
    roomId: null as string | null,
    clientId: null as string | null,
    assignedToId: null as string | null,
    createdAt: new Date('2026-07-10T10:00:00Z'),
    updatedAt: new Date('2026-07-10T10:00:00Z'),
    _count: { messages: 0, leads: 0 },
  };

  const mockEventFindById = {
    ...baseEvent,
    deceased: {
      id: deceasedId,
      tenantId,
      firstName: 'John',
      lastName: 'Doe',
      birthDate: null,
      deathDate: null,
      photoUrl: null,
      biography: null,
      epitaph: null,
      deletedAt: null,
      createdAt: new Date('2026-07-10T10:00:00Z'),
      updatedAt: new Date('2026-07-10T10:00:00Z'),
    },
    room: null,
    client: null,
    assignedTo: null,
  };

  const correctAccessCodeHash =
    'b0dcde83660e1138f96795f4dd8fdd8daefc5a7805c5ef8c58620097277d5b98';

  const mockEventFindBySlug = {
    ...baseEvent,
    accessCode: correctAccessCodeHash,
    tenantId,
    deceased: {
      firstName: 'John',
      lastName: 'Doe',
      birthDate: null,
      deathDate: null,
      photoUrl: null,
      biography: null,
      epitaph: null,
    },
    tenant: {
      name: 'Test Tenant',
      brandConfig: {
        logoUrl: 'https://example.com/logo.png',
        faviconUrl: null,
        primaryColor: '#4F46E5',
        secondaryColor: '#7C3AED',
        textColor: '#111827',
        backgroundColor: '#F9FAFB',
      },
    },
  };

  const mockMessage = {
    id: messageId,
    eventId,
    tenantId,
    authorName: 'Jane Viewer',
    content: 'Descansa en paz',
    iconType: 'candle',
    status: 'APPROVED',
    approvedBy: null as string | null,
    approvedAt: null as Date | null,
    rejectedReason: null as string | null,
    deletedAt: null as Date | null,
    createdAt: new Date('2026-07-15T10:05:00Z'),
    updatedAt: new Date('2026-07-15T10:05:00Z'),
  };

  const mockDeceased = {
    id: deceasedId,
    tenantId,
    firstName: 'John',
    lastName: 'Doe',
    birthDate: null,
    deathDate: null,
    photoUrl: null,
    biography: null,
    epitaph: null,
    deletedAt: null,
    createdAt: new Date('2026-07-10T10:00:00Z'),
    updatedAt: new Date('2026-07-10T10:00:00Z'),
  };

  beforeAll(() => {
    randomBytesSpy = jest.spyOn(crypto, 'randomBytes');
    randomBytesSpy.mockImplementation((size: number) =>
      Buffer.alloc(size, 0xab),
    );
  });

  afterAll(() => {
    randomBytesSpy.mockRestore();
  });

  beforeEach(async () => {
    mockRepo = {
      findManyByTenant: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findMessagesByEvent: jest.fn(),
      findMessagesPendingModeration: jest.fn(),
      createMessage: jest.fn(),
      approveMessage: jest.fn(),
      rejectMessage: jest.fn(),
      softDeleteMessage: jest.fn(),
      createDeceased: jest.fn(),
      findDeceasedByTenant: jest.fn(),
      findByRoomAndTimeOverlap: jest.fn(),
      createLead: jest.fn(),
      updateViewerCount: jest.fn(),
      findLeadsWithEmailByEvent: jest.fn().mockResolvedValue([]),
      findByProviderStreamId: jest.fn(),
    } as unknown as jest.Mocked<StreamingRepository>;

    mockRepo.update.mockImplementation((_tenantId: any, id: any, data: any) =>
      Promise.resolve({ ...baseEvent, id, ...data }),
    );

    mockGateway = {
      broadcastStreamStatus: jest.fn(),
      broadcastNewMessage: jest.fn(),
      broadcastMessagePending: jest.fn(),
      broadcastViewerCount: jest.fn(),
      broadcastReaction: jest.fn(),
      server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    } as unknown as jest.Mocked<NotificationsGateway> & {
      server: { to: jest.Mock; emit: jest.Mock };
    };

    mockConfig = {
      get: jest.fn().mockReturnValue('mux'),
    } as unknown as jest.Mocked<ConfigService>;

    mockProvider = {
      name: 'mux',
      createLiveStream: jest.fn().mockResolvedValue({
        streamKey: 'zentic_defaultstreamkey',
        rtmpUrl: 'rtmps://global-live.mux.com:443/app',
        providerStreamId: 'mux-live-stream-1',
      }),
      getStreamStatus: jest.fn().mockResolvedValue('active'),
      disableLiveStream: jest.fn().mockResolvedValue(undefined),
      parseWebhookEvent: jest.fn(),
    } as unknown as jest.Mocked<StreamProvider>;

    mockMuxProvider = {
      parseWebhookEvent: jest.fn(),
    } as unknown as jest.Mocked<MuxStreamProvider>;

    mockCloudflareProvider = {
      parseWebhookEvent: jest.fn(),
    } as unknown as jest.Mocked<CloudflareStreamProvider>;

    mockEmailService = {
      sendStreamStartedEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamingService,
        { provide: StreamingRepository, useValue: mockRepo },
        { provide: NotificationsGateway, useValue: mockGateway },
        { provide: ConfigService, useValue: mockConfig },
        { provide: STREAM_PROVIDER_TOKEN, useValue: mockProvider },
        { provide: MuxStreamProvider, useValue: mockMuxProvider },
        { provide: CloudflareStreamProvider, useValue: mockCloudflareProvider },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<StreamingService>(StreamingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all events for a tenant', async () => {
      const events = [mockEventFindById];
      mockRepo.findManyByTenant.mockResolvedValue(events as any);

      const result = await service.findAll(tenantId);

      expect(result).toEqual(events);
      expect(mockRepo.findManyByTenant).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('findOne', () => {
    it('should return an event by id', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);

      const result = await service.findOne(tenantId, eventId);

      expect(result).toEqual(mockEventFindById);
      expect(mockRepo.findById).toHaveBeenCalledWith(tenantId, eventId);
    });

    it('should throw NotFoundException when event not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(tenantId, eventId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findPublic', () => {
    it('should return public event data', async () => {
      mockRepo.findBySlug.mockResolvedValue(mockEventFindBySlug as any);

      const result = await service.findPublic('test-event');

      expect(result).toEqual({
        id: baseEvent.id,
        title: baseEvent.title,
        slug: baseEvent.slug,
        status: baseEvent.status,
        ceremonyType: baseEvent.ceremonyType,
        scheduledAt: baseEvent.scheduledAt,
        startedAt: baseEvent.startedAt,
        finishedAt: baseEvent.finishedAt,
        recordingUrl: null,
        isPublic: baseEvent.isPublic,
        viewerCount: baseEvent.viewerCount,
        deceased: mockEventFindBySlug.deceased,
        tenant: mockEventFindBySlug.tenant,
      });
      expect(mockRepo.findBySlug).toHaveBeenCalledWith('test-event');
    });

    it('should throw NotFoundException when event does not exist', async () => {
      mockRepo.findBySlug.mockResolvedValue(null);

      await expect(service.findPublic('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when event is deleted', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        ...mockEventFindBySlug,
        deletedAt: new Date(),
      } as any);

      await expect(service.findPublic('deleted-event')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set recordingUrl to null when status is not FINISHED', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        ...mockEventFindBySlug,
        status: 'LIVE',
        recordingUrl: 'https://example.com/recording.mp4',
      } as any);

      const result = await service.findPublic('live-event');

      expect(result.recordingUrl).toBeNull();
    });

    it('should include recordingUrl when status is FINISHED', async () => {
      const recordingUrl = 'https://example.com/recording.mp4';
      mockRepo.findBySlug.mockResolvedValue({
        ...mockEventFindBySlug,
        status: 'FINISHED',
        recordingUrl,
      } as any);

      const result = await service.findPublic('finished-event');

      expect(result.recordingUrl).toBe(recordingUrl);
    });
  });

  describe('create', () => {
    const createDto = {
      title: 'New Event',
      ceremonyType: 'VELATORIO',
      scheduledAt: '2026-07-20T14:00:00Z',
      deceased: { firstName: 'Maria', lastName: 'Lopez' },
      isPublic: true,
      moderationMode: ModerationMode.AUTO,
      estimatedDuration: 90,
    } as CreateEventDto;

    const createdDeceased = { ...mockDeceased, id: 'deceased-new' };

    it('should create an event with deceased data', async () => {
      mockRepo.createDeceased.mockResolvedValue(createdDeceased as any);
      mockRepo.findDeceasedByTenant.mockResolvedValue(createdDeceased as any);
      mockRepo.findByRoomAndTimeOverlap.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({
        ...baseEvent,
        id: 'new-event-id',
      } as any);

      const result = await service.create(tenantId, createDto);

      expect(mockRepo.createDeceased).toHaveBeenCalledWith({
        tenantId,
        firstName: 'Maria',
        lastName: 'Lopez',
        birthDate: undefined,
        deathDate: undefined,
        photoUrl: undefined,
        biography: undefined,
        epitaph: undefined,
      });
      expect(mockRepo.findDeceasedByTenant).toHaveBeenCalledWith(
        tenantId,
        'deceased-new',
      );
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result.id).toBe('new-event-id');
    });

    it('should create an event with existing deceasedId', async () => {
      const dtoWithDeceasedId = {
        ...createDto,
        deceased: undefined,
        deceasedId,
      } as unknown as CreateEventDto;

      mockRepo.findByRoomAndTimeOverlap.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(baseEvent as any);

      const result = await service.create(tenantId, dtoWithDeceasedId);

      expect(mockRepo.createDeceased).not.toHaveBeenCalled();
      expect(mockRepo.findDeceasedByTenant).not.toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result.id).toBe(eventId);
    });

    it('should throw BadRequestException when no deceased info provided', async () => {
      const dtoWithoutDeceased = {
        title: 'No Deceased',
        ceremonyType: 'VELATORIO',
        scheduledAt: '2026-07-20T14:00:00Z',
      } as CreateEventDto;

      await expect(
        service.create(tenantId, dtoWithoutDeceased),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when created deceased not found', async () => {
      mockRepo.createDeceased.mockResolvedValue(createdDeceased as any);
      mockRepo.findDeceasedByTenant.mockResolvedValue(null);

      await expect(service.create(tenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when room overlaps', async () => {
      mockRepo.createDeceased.mockResolvedValue(createdDeceased as any);
      mockRepo.findDeceasedByTenant.mockResolvedValue(createdDeceased as any);
      mockRepo.findByRoomAndTimeOverlap.mockResolvedValue({
        id: 'conflicting-event',
      } as any);

      const dtoWithRoom = { ...createDto, roomId: 'room-1' } as CreateEventDto;

      await expect(service.create(tenantId, dtoWithRoom)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should generate a unique slug and request credentials from the provider', async () => {
      mockRepo.createDeceased.mockResolvedValue(createdDeceased as any);
      mockRepo.findDeceasedByTenant.mockResolvedValue(createdDeceased as any);
      mockRepo.findByRoomAndTimeOverlap.mockResolvedValue(null);
      mockRepo.create.mockImplementation((data: any) =>
        Promise.resolve({ ...data, id: 'new-id' }),
      );
      mockProvider.createLiveStream.mockResolvedValue({
        streamKey: 'zentic_generatedkey',
        rtmpUrl: 'rtmps://global-live.mux.com:443/app',
        providerStreamId: 'mux-live-stream-new',
      });

      await service.create(tenantId, createDto);

      const createCallArgs = mockRepo.create.mock.calls[0][0] as any;
      expect(createCallArgs.slug).toMatch(/^new-event-/);
      expect(createCallArgs.streamKey).toBeUndefined();

      expect(mockProvider.createLiveStream).toHaveBeenCalled();
      const updateCallArgs = mockRepo.update.mock.calls[0][2] as any;
      expect(updateCallArgs).toEqual({
        streamKey: 'zentic_generatedkey',
        rtmpUrl: 'rtmps://global-live.mux.com:443/app',
        provider: 'mux',
        providerStreamId: 'mux-live-stream-new',
      });
    });

    it('should hash accessCode if provided', async () => {
      const dtoWithCode = {
        ...createDto,
        accessCode: 'secret123',
      } as CreateEventDto;
      mockRepo.createDeceased.mockResolvedValue(createdDeceased as any);
      mockRepo.findDeceasedByTenant.mockResolvedValue(createdDeceased as any);
      mockRepo.findByRoomAndTimeOverlap.mockResolvedValue(null);
      mockRepo.create.mockImplementation((data: any) =>
        Promise.resolve({ ...data, id: 'new-id' }),
      );

      await service.create(tenantId, dtoWithCode);

      const createCallArgs = mockRepo.create.mock.calls[0][0] as any;
      expect(createCallArgs.accessCode).toBeDefined();
      expect(createCallArgs.accessCode).not.toBe('secret123');
      expect(createCallArgs.accessCode).toHaveLength(64);
    });

    it('should not set accessCode when not provided', async () => {
      mockRepo.createDeceased.mockResolvedValue(createdDeceased as any);
      mockRepo.findDeceasedByTenant.mockResolvedValue(createdDeceased as any);
      mockRepo.findByRoomAndTimeOverlap.mockResolvedValue(null);
      mockRepo.create.mockImplementation((data: any) =>
        Promise.resolve({ ...data, id: 'new-id' }),
      );

      await service.create(tenantId, createDto);

      const createCallArgs = mockRepo.create.mock.calls[0][0] as any;
      expect(createCallArgs.accessCode).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update an event', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      mockRepo.update.mockResolvedValue({
        ...mockEventFindById,
        title: 'Updated Title',
      } as any);

      const result = await service.update(tenantId, eventId, {
        title: 'Updated Title',
        description: 'Updated description',
        estimatedDuration: 150,
      });

      expect(mockRepo.update).toHaveBeenCalledWith(tenantId, eventId, {
        title: 'Updated Title',
        description: 'Updated description',
        estimatedDuration: 150,
      });
      expect(result.title).toBe('Updated Title');
    });

    it('should throw BadRequestException when event is LIVE', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockEventFindById,
        status: 'LIVE',
      } as any);

      await expect(
        service.update(tenantId, eventId, { title: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when event is FINISHED', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockEventFindById,
        status: 'FINISHED',
      } as any);

      await expect(
        service.update(tenantId, eventId, { title: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when event not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.update(tenantId, eventId, { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should build Prisma.EventUpdateInput from non-undefined fields', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      mockRepo.update.mockResolvedValue(mockEventFindById as any);

      await service.update(tenantId, eventId, {
        title: 'New Title',
        description: 'New Desc',
        ceremonyType: 'MISA',
        estimatedDuration: 180,
        isPublic: false,
        moderationMode: ModerationMode.MANUAL,
        scheduledAt: '2026-08-01T12:00:00Z',
        roomId: 'room-2',
        clientId: 'client-1',
        assignedToId: null as unknown as undefined,
        accessCode: 'newcode',
        deceasedId: 'deceased-2',
      });

      const updateData = mockRepo.update.mock.calls[0][2] as any;
      expect(updateData.title).toBe('New Title');
      expect(updateData.description).toBe('New Desc');
      expect(updateData.ceremonyType).toBe('MISA');
      expect(updateData.estimatedDuration).toBe(180);
      expect(updateData.isPublic).toBe(false);
      expect(updateData.moderationMode).toBe(ModerationMode.MANUAL);
      expect(updateData.scheduledAt).toBeInstanceOf(Date);
      expect(updateData.room).toEqual({ connect: { id: 'room-2' } });
      expect(updateData.client).toEqual({ connect: { id: 'client-1' } });
      expect(updateData.assignedTo).toEqual({ disconnect: true });
      expect(updateData.accessCode).toHaveLength(64);
      expect(updateData.deceased).toEqual({ connect: { id: 'deceased-2' } });
    });
  });

  describe('remove', () => {
    it('should soft-delete an event', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      mockRepo.softDelete.mockResolvedValue({
        ...mockEventFindById,
        deletedAt: new Date(),
        status: 'CANCELLED',
      } as any);

      const result = await service.remove(tenantId, eventId);

      expect(mockRepo.softDelete).toHaveBeenCalledWith(tenantId, eventId);
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw NotFoundException when event not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.remove(tenantId, eventId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('startStream', () => {
    it('should start a stream and broadcast', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      const updatedEvent = { ...mockEventFindById, status: 'LIVE' };
      mockRepo.update.mockResolvedValue(updatedEvent as any);

      const result = await service.startStream(tenantId, eventId);

      expect(mockRepo.update).toHaveBeenCalledWith(tenantId, eventId, {
        status: 'LIVE',
        startedAt: expect.any(Date),
      });
      expect(mockGateway.broadcastStreamStatus).toHaveBeenCalledWith(eventId, {
        eventId,
        tenantId,
        status: EventStatus.LIVE,
      });
      expect(result).toEqual(updatedEvent);
    });

    it('should throw BadRequestException when event is not SCHEDULED', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockEventFindById,
        status: 'LIVE',
      } as any);

      await expect(service.startStream(tenantId, eventId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should check the provider signal when providerStreamId is set and throw if not active', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockEventFindById,
        providerStreamId: 'mux-live-stream-1',
      } as any);
      mockProvider.getStreamStatus.mockResolvedValue('idle');

      await expect(service.startStream(tenantId, eventId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockProvider.getStreamStatus).toHaveBeenCalledWith(
        'mux-live-stream-1',
      );
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should start the stream when the provider reports an active signal', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockEventFindById,
        providerStreamId: 'mux-live-stream-1',
      } as any);
      mockProvider.getStreamStatus.mockResolvedValue('active');

      const result = await service.startStream(tenantId, eventId);

      expect(result.status).toBe('LIVE');
    });

    it('should email leads with an email on file that the stream started', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      mockRepo.findLeadsWithEmailByEvent.mockResolvedValue([
        { name: 'Ana', email: 'ana@example.com' },
        { name: 'Sin correo', email: null },
      ] as any);
      mockConfig.get.mockReturnValue('https://app.zentic.pro');

      await service.startStream(tenantId, eventId);

      expect(mockRepo.findLeadsWithEmailByEvent).toHaveBeenCalledWith(eventId);
      expect(mockEmailService.sendStreamStartedEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendStreamStartedEmail).toHaveBeenCalledWith({
        to: 'ana@example.com',
        eventTitle: mockEventFindById.title,
        eventUrl: `https://app.zentic.pro/e/${mockEventFindById.slug}`,
      });
    });

    it('should not fail startStream when a lead email fails to send', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      mockRepo.findLeadsWithEmailByEvent.mockResolvedValue([
        { name: 'Ana', email: 'ana@example.com' },
      ] as any);
      mockEmailService.sendStreamStartedEmail.mockRejectedValue(
        new Error('SMTP down'),
      );

      const result = await service.startStream(tenantId, eventId);

      expect(result.status).toBe('LIVE');
    });
  });

  describe('stopStream', () => {
    it('should stop a LIVE stream and broadcast', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockEventFindById,
        status: 'LIVE',
      } as any);
      const updatedEvent = { ...mockEventFindById, status: 'FINISHED' };
      mockRepo.update.mockResolvedValue(updatedEvent as any);

      const result = await service.stopStream(tenantId, eventId);

      expect(mockRepo.update).toHaveBeenCalledWith(tenantId, eventId, {
        status: 'FINISHED',
        finishedAt: expect.any(Date),
      });
      expect(mockGateway.broadcastStreamStatus).toHaveBeenCalledWith(eventId, {
        eventId,
        tenantId,
        status: EventStatus.FINISHED,
      });
      expect(result).toEqual(updatedEvent);
    });

    it('should stop a PAUSED stream', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockEventFindById,
        status: 'PAUSED',
      } as any);
      mockRepo.update.mockResolvedValue({
        ...mockEventFindById,
        status: 'FINISHED',
      } as any);

      const result = await service.stopStream(tenantId, eventId);

      expect(mockRepo.update).toHaveBeenCalledWith(tenantId, eventId, {
        status: 'FINISHED',
        finishedAt: expect.any(Date),
      });
      expect(result.status).toBe('FINISHED');
    });

    it('should throw BadRequestException when event is FINISHED', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockEventFindById,
        status: 'FINISHED',
      } as any);

      await expect(service.stopStream(tenantId, eventId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should disable the live stream on the provider when providerStreamId is set', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockEventFindById,
        status: 'LIVE',
        providerStreamId: 'mux-live-stream-1',
      } as any);

      await service.stopStream(tenantId, eventId);

      expect(mockProvider.disableLiveStream).toHaveBeenCalledWith(
        'mux-live-stream-1',
      );
    });

    it('should not call the provider when there is no providerStreamId', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockEventFindById,
        status: 'LIVE',
      } as any);

      await service.stopStream(tenantId, eventId);

      expect(mockProvider.disableLiveStream).not.toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('should return messages for an event', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      const messages = [mockMessage];
      mockRepo.findMessagesByEvent.mockResolvedValue(messages as any);

      const result = await service.getMessages(tenantId, eventId);

      expect(mockRepo.findMessagesByEvent).toHaveBeenCalledWith(
        tenantId,
        eventId,
      );
      expect(result).toEqual(messages);
    });

    it('should throw NotFoundException when event not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getMessages(tenantId, eventId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepo.findMessagesByEvent).not.toHaveBeenCalled();
    });
  });

  describe('getPendingMessages', () => {
    it('should return pending messages', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      const pendingMessages = [{ ...mockMessage, status: 'PENDING' }];
      mockRepo.findMessagesPendingModeration.mockResolvedValue(
        pendingMessages as any,
      );

      const result = await service.getPendingMessages(tenantId, eventId);

      expect(mockRepo.findMessagesPendingModeration).toHaveBeenCalledWith(
        tenantId,
        eventId,
      );
      expect(result).toEqual(pendingMessages);
    });
  });

  describe('sendMessage', () => {
    const sendMessageDto: SendMessageDto = {
      authorName: 'Janet Public',
      content: 'Qué bonito homenaje',
      iconType: 'flower',
    };

    it('should create a message with AUTO moderation and broadcast', async () => {
      mockRepo.findBySlug.mockResolvedValue(mockEventFindBySlug as any);
      const createdMessage = {
        ...mockMessage,
        id: 'msg-new',
        authorName: sendMessageDto.authorName,
        content: sendMessageDto.content,
        iconType: sendMessageDto.iconType,
        createdAt: new Date('2026-07-15T10:10:00Z'),
      };
      mockRepo.createMessage.mockResolvedValue(createdMessage as any);

      const result = await service.sendMessage('test-slug', sendMessageDto);

      expect(mockRepo.createMessage).toHaveBeenCalledWith({
        authorName: 'Janet Public',
        content: 'Qué bonito homenaje',
        iconType: 'flower',
        status: 'APPROVED',
        event: { connect: { id: eventId } },
        tenantId,
      });
      expect(mockGateway.broadcastNewMessage).toHaveBeenCalledWith(eventId, {
        eventId,
        tenantId,
        message: {
          id: 'msg-new',
          authorName: 'Janet Public',
          content: 'Qué bonito homenaje',
          iconType: 'flower',
          createdAt: '2026-07-15T10:10:00.000Z',
        },
      });
      expect(result).toEqual(createdMessage);
    });

    it('should create a message with MANUAL moderation and notify the moderation queue instead of viewers', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        ...mockEventFindBySlug,
        moderationMode: 'MANUAL',
      } as any);
      const pendingMessage = {
        ...mockMessage,
        id: 'msg-pending',
        status: 'PENDING',
      };
      mockRepo.createMessage.mockResolvedValue(pendingMessage as any);

      const result = await service.sendMessage('test-slug', sendMessageDto);

      expect(mockRepo.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING' }),
      );
      expect(mockGateway.broadcastNewMessage).not.toHaveBeenCalled();
      expect(mockGateway.broadcastMessagePending).toHaveBeenCalledWith(
        eventId,
        {
          eventId,
          tenantId,
          message: {
            id: 'msg-pending',
            authorName: pendingMessage.authorName,
            content: pendingMessage.content,
            iconType: pendingMessage.iconType,
            createdAt: pendingMessage.createdAt.toISOString(),
          },
        },
      );
      expect(result).toEqual(pendingMessage);
    });

    it('should throw NotFoundException when event not found', async () => {
      mockRepo.findBySlug.mockResolvedValue(null);

      await expect(
        service.sendMessage('bad-slug', sendMessageDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepo.createMessage).not.toHaveBeenCalled();
    });
  });

  describe('approveMessage', () => {
    it('should approve a message and broadcast', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      const approvedMessage = {
        ...mockMessage,
        status: 'APPROVED',
        approvedAt: new Date('2026-07-15T10:15:00Z'),
      };
      mockRepo.approveMessage.mockResolvedValue(approvedMessage as any);

      const result = await service.approveMessage(
        tenantId,
        eventId,
        messageId,
        'operator-1',
      );

      expect(mockRepo.approveMessage).toHaveBeenCalledWith(
        eventId,
        messageId,
        'operator-1',
      );
      expect(mockGateway.broadcastNewMessage).toHaveBeenCalledWith(eventId, {
        eventId,
        tenantId,
        message: {
          id: approvedMessage.id,
          authorName: approvedMessage.authorName,
          content: approvedMessage.content,
          iconType: approvedMessage.iconType,
          createdAt: approvedMessage.createdAt.toISOString(),
        },
      });
      expect(result).toEqual(approvedMessage);
    });

    it('should throw NotFoundException when event not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.approveMessage(tenantId, eventId, messageId, 'operator-1'),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepo.approveMessage).not.toHaveBeenCalled();
    });
  });

  describe('rejectMessage', () => {
    it('should reject a message with reason', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      const rejectedMessage = {
        ...mockMessage,
        status: 'REJECTED',
        rejectedReason: 'Contenido inapropiado',
      };
      mockRepo.rejectMessage.mockResolvedValue(rejectedMessage as any);

      const reason = 'Contenido inapropiado';
      const result = await service.rejectMessage(
        tenantId,
        eventId,
        messageId,
        reason,
      );

      expect(mockRepo.rejectMessage).toHaveBeenCalledWith(
        eventId,
        messageId,
        reason,
      );
      expect(result).toEqual(rejectedMessage);
    });

    it('should reject a message without reason', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      mockRepo.rejectMessage.mockResolvedValue({
        ...mockMessage,
        status: 'REJECTED',
        rejectedReason: null,
      } as any);

      const result = await service.rejectMessage(tenantId, eventId, messageId);

      expect(mockRepo.rejectMessage).toHaveBeenCalledWith(
        eventId,
        messageId,
        undefined,
      );
    });
  });

  describe('deleteMessage', () => {
    it('should soft-delete a message', async () => {
      mockRepo.findById.mockResolvedValue(mockEventFindById as any);
      const deletedMessage = { ...mockMessage, deletedAt: new Date() };
      mockRepo.softDeleteMessage.mockResolvedValue(deletedMessage as any);

      const result = await service.deleteMessage(tenantId, eventId, messageId);

      expect(mockRepo.softDeleteMessage).toHaveBeenCalledWith(
        eventId,
        messageId,
      );
      expect(result).toEqual(deletedMessage);
    });
  });

  describe('sendReaction', () => {
    const sendReactionDto: SendReactionDto = { type: 'heart' };
    const clientIp = '192.168.1.1';

    beforeEach(() => {
      mockRepo.findBySlug.mockResolvedValue(mockEventFindBySlug as any);
    });

    it('should send a reaction without IP', async () => {
      const result = await service.sendReaction('test-slug', sendReactionDto);

      expect(mockGateway.server.to).toHaveBeenCalledWith(`event:${eventId}`);
      expect(mockGateway.server.emit).toHaveBeenCalledWith('new-reaction', {
        eventId,
        tenantId,
        reaction: { type: 'heart', icon: '❤️' },
      });
      expect(result).toEqual({ sent: true });
    });

    it('should send a reaction with IP under cooldown limit', async () => {
      const result = await service.sendReaction(
        'test-slug',
        sendReactionDto,
        clientIp,
      );

      expect(result).toEqual({ sent: true });
      expect(mockGateway.server.to).toHaveBeenCalled();
    });

    it('should throw BadRequestException when rate limit exceeded', async () => {
      await service.sendReaction('test-slug', sendReactionDto, clientIp);

      await expect(
        service.sendReaction('test-slug', sendReactionDto, clientIp),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clean stale cooldowns when map exceeds 1000 entries', async () => {
      const cooldowns = (service as any).reactionCooldowns;
      const now = Date.now();
      for (let i = 0; i < 1001; i++) {
        cooldowns.set(`stale-ip-${i}`, now - 20000);
      }

      await service.sendReaction('test-slug', sendReactionDto, clientIp);

      expect(cooldowns.size).toBeLessThanOrEqual(2);
    });

    it('should throw NotFoundException when event not found', async () => {
      mockRepo.findBySlug.mockResolvedValue(null);

      await expect(
        service.sendReaction('bad-slug', sendReactionDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should map reaction type to correct icon', async () => {
      const reactions = [
        { type: 'candle', icon: '🕯️' },
        { type: 'flower', icon: '🌸' },
        { type: 'dove', icon: '🕊️' },
      ];

      for (const { type, icon } of reactions) {
        await service.sendReaction('test-slug', { type });

        expect(mockGateway.server.emit).toHaveBeenLastCalledWith(
          'new-reaction',
          {
            eventId,
            tenantId,
            reaction: { type, icon },
          },
        );
      }
    });
  });

  describe('validateAccessCode', () => {
    const accessCodeDto: AccessCodeDto = { code: 'correct-code' };

    beforeEach(() => {
      mockRepo.findBySlug.mockResolvedValue(mockEventFindBySlug as any);
    });

    it('should return valid for public event without access code', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        ...mockEventFindBySlug,
        isPublic: true,
        accessCode: null,
      } as any);

      const result = await service.validateAccessCode(
        'test-slug',
        accessCodeDto,
      );

      expect(result).toEqual({ valid: true, eventId });
    });

    it('should return valid for correct access code', async () => {
      const result = await service.validateAccessCode(
        'test-slug',
        accessCodeDto,
      );

      expect(result).toEqual({ valid: true, eventId });
    });

    it('should throw ForbiddenException for incorrect access code', async () => {
      await expect(
        service.validateAccessCode('test-slug', { code: 'wrong-code' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create lead when name and email provided', async () => {
      const dto: AccessCodeDto = {
        code: 'correct-code',
        name: 'Alice Walker',
        email: 'alice@example.com',
        consent: true,
      };
      mockRepo.createLead.mockResolvedValue({ id: 'lead-1' } as any);

      const result = await service.validateAccessCode('test-slug', dto);

      expect(mockRepo.createLead).toHaveBeenCalledWith({
        name: 'Alice Walker',
        email: 'alice@example.com',
        consent: true,
        source: 'DIRECT',
        tenant: { connect: { id: tenantId } },
        event: { connect: { id: eventId } },
      });
      expect(result).toEqual({ valid: true, eventId });
    });

    it('should create lead with anonymous name when email provided without name', async () => {
      const dto: AccessCodeDto = {
        code: 'correct-code',
        email: 'anon@example.com',
        consent: false,
      };
      mockRepo.createLead.mockResolvedValue({ id: 'lead-2' } as any);

      const result = await service.validateAccessCode('test-slug', dto);

      expect(mockRepo.createLead).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Anónimo' }),
      );
    });

    it('should throw NotFoundException when event not found', async () => {
      mockRepo.findBySlug.mockResolvedValue(null);

      await expect(
        service.validateAccessCode('bad-slug', accessCodeDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('private helpers (tested indirectly via create)', () => {
    beforeEach(() => {
      mockRepo.createDeceased.mockResolvedValue({
        ...mockDeceased,
        id: 'deceased-helper',
      } as any);
      mockRepo.findDeceasedByTenant.mockResolvedValue(mockDeceased as any);
      mockRepo.findByRoomAndTimeOverlap.mockResolvedValue(null);
      mockRepo.create.mockImplementation((data: any) =>
        Promise.resolve({ ...data, id: 'id' }),
      );
    });

    it('generateSlug should produce kebab-case with hex suffix', async () => {
      const dto = {
        title: 'Mi Ceremonia Especial!',
        ceremonyType: 'VELATORIO',
        scheduledAt: '2026-08-01T10:00:00Z',
        deceasedId,
      } as CreateEventDto;

      await service.create(tenantId, dto);

      const slug = (mockRepo.create.mock.calls[0][0] as any).slug;
      expect(slug).toMatch(/^mi-ceremonia-especial-abababab$/);
    });

    it('hashAccessCode should produce a SHA-256 hex digest', async () => {
      const dto = {
        title: 'Test',
        ceremonyType: 'VELATORIO',
        scheduledAt: '2026-08-01T10:00:00Z',
        deceasedId,
        accessCode: 'my-secret-code',
      } as CreateEventDto;

      await service.create(tenantId, dto);

      const accessCode = (mockRepo.create.mock.calls[0][0] as any).accessCode;
      expect(accessCode).toHaveLength(64);
      expect(accessCode).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('handleMuxWebhook / handleCloudflareWebhook', () => {
    const rawBody = Buffer.from('{}');
    const headers = { 'mux-signature': 'v1=abc' };

    it('ignores an invalid or unrecognized webhook', async () => {
      mockMuxProvider.parseWebhookEvent.mockReturnValue(null);

      await service.handleMuxWebhook(rawBody, headers);

      expect(mockRepo.findByProviderStreamId).not.toHaveBeenCalled();
    });

    it('ignores stream.active/idle events (state is driven by the operator panel)', async () => {
      mockMuxProvider.parseWebhookEvent.mockReturnValue({
        type: 'stream.active',
        providerStreamId: 'mux-live-stream-1',
      });

      await service.handleMuxWebhook(rawBody, headers);

      expect(mockRepo.findByProviderStreamId).not.toHaveBeenCalled();
    });

    it('sets recordingUrl and a 30-day expiry for a BASIC plan when recording.ready arrives', async () => {
      mockMuxProvider.parseWebhookEvent.mockReturnValue({
        type: 'recording.ready',
        providerStreamId: 'mux-live-stream-1',
        recordingUrl: 'https://stream.mux.com/abc.m3u8',
      });
      mockRepo.findByProviderStreamId.mockResolvedValue({
        id: eventId,
        tenantId,
        tenant: { plan: 'BASIC' },
      } as any);

      await service.handleMuxWebhook(rawBody, headers);

      expect(mockRepo.update).toHaveBeenCalledWith(tenantId, eventId, {
        recordingUrl: 'https://stream.mux.com/abc.m3u8',
        recordingExpiry: expect.any(Date),
      });
    });

    it('sets no expiry (indefinite) for an ENTERPRISE plan', async () => {
      mockCloudflareProvider.parseWebhookEvent.mockReturnValue({
        type: 'recording.ready',
        providerStreamId: 'cf-live-input-1',
        recordingUrl: 'https://videodelivery.net/abc/manifest/video.m3u8',
      });
      mockRepo.findByProviderStreamId.mockResolvedValue({
        id: eventId,
        tenantId,
        tenant: { plan: 'ENTERPRISE' },
      } as any);

      await service.handleCloudflareWebhook(rawBody, headers);

      expect(mockRepo.update).toHaveBeenCalledWith(tenantId, eventId, {
        recordingUrl: 'https://videodelivery.net/abc/manifest/video.m3u8',
        recordingExpiry: null,
      });
    });

    it('is a no-op when the event cannot be found by providerStreamId', async () => {
      mockMuxProvider.parseWebhookEvent.mockReturnValue({
        type: 'recording.ready',
        providerStreamId: 'unknown-stream',
        recordingUrl: 'https://stream.mux.com/abc.m3u8',
      });
      mockRepo.findByProviderStreamId.mockResolvedValue(null);

      await service.handleMuxWebhook(rawBody, headers);

      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });
});
