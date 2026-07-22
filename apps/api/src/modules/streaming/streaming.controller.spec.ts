import { Test, TestingModule } from '@nestjs/testing';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SendReactionDto } from './dto/send-reaction.dto';
import { AccessCodeDto } from './dto/access-code.dto';
import { StreamAccessService } from './stream-access.service';

describe('StreamingController', () => {
  let controller: StreamingController;
  let service: jest.Mocked<StreamingService>;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    getCredentials: jest.fn(),
    revealCredentials: jest.fn(),
    rotateStreamKey: jest.fn(),
    auditCredentialCopy: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    startStream: jest.fn(),
    stopStream: jest.fn(),
    findPublic: jest.fn(),
    getPublicMessages: jest.fn(),
    getPlayback: jest.fn(),
    sendMessage: jest.fn(),
    sendReaction: jest.fn(),
    validateAccessCode: jest.fn(),
    getMessages: jest.fn(),
    getPendingMessages: jest.fn(),
    approveMessage: jest.fn(),
    rejectMessage: jest.fn(),
    deleteMessage: jest.fn(),
  };
  const mockStreamAccess = {
    cookieOptions: jest.fn().mockReturnValue({ httpOnly: true, path: '/' }),
  };
  const request = {
    cookies: { stream_event_access: 'viewer-token' },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StreamingController],
      providers: [
        { provide: StreamingService, useValue: mockService },
        { provide: StreamAccessService, useValue: mockStreamAccess },
      ],
    }).compile();

    controller = module.get<StreamingController>(StreamingController);
    service = module.get(StreamingService) as jest.Mocked<StreamingService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with the tenantId and return the result', async () => {
      const tenantId = 'tenant-1';
      const expected = [{ id: 'event-1' }];
      service.findAll.mockResolvedValue(expected as any);

      const result = await controller.findAll(tenantId);

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(tenantId);
      expect(result).toBe(expected);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with tenantId and id and return the result', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const expected = { id, title: 'Test Event' };
      service.findOne.mockResolvedValue(expected as any);

      const result = await controller.findOne(tenantId, id);

      expect(service.findOne).toHaveBeenCalledTimes(1);
      expect(service.findOne).toHaveBeenCalledWith(tenantId, id);
      expect(result).toBe(expected);
    });
  });

  describe('getCredentials', () => {
    it('should request credentials for the tenant event', async () => {
      const expected = {
        streamKey: 'secr••••••••cret',
        rtmpUrl: 'rtmps://example',
        revealed: false,
      };
      service.getCredentials.mockResolvedValue(expected);

      const result = await controller.getCredentials('tenant-1', 'event-1');

      expect(service.getCredentials).toHaveBeenCalledWith(
        'tenant-1',
        'event-1',
      );
      expect(result).toBe(expected);
    });
  });

  describe('create', () => {
    it('should call service.create with tenantId and dto and return the result', async () => {
      const tenantId = 'tenant-1';
      const dto: CreateEventDto = {
        title: 'New Event',
        ceremonyType: 'VELATORIO',
        scheduledAt: '2026-07-15T10:00:00Z',
      };
      const expected = { id: 'event-new', ...dto };
      service.create.mockResolvedValue(expected as any);

      const result = await controller.create(tenantId, dto);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(tenantId, dto);
      expect(result).toBe(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with tenantId, id and dto and return the result', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const dto: UpdateEventDto = { title: 'Updated Title' };
      const expected = { id, title: 'Updated Title' };
      service.update.mockResolvedValue(expected as any);

      const result = await controller.update(tenantId, id, dto);

      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(tenantId, id, dto);
      expect(result).toBe(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with tenantId and id and return the result', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const expected = { id, deletedAt: new Date() };
      service.remove.mockResolvedValue(expected as any);

      const result = await controller.remove(tenantId, id);

      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(tenantId, id);
      expect(result).toBe(expected);
    });
  });

  describe('startStream', () => {
    it('should call service.startStream with tenantId and id and return the result', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const expected = { id, status: 'LIVE' };
      service.startStream.mockResolvedValue(expected as any);

      const result = await controller.startStream(tenantId, id);

      expect(service.startStream).toHaveBeenCalledTimes(1);
      expect(service.startStream).toHaveBeenCalledWith(tenantId, id);
      expect(result).toBe(expected);
    });
  });

  describe('stopStream', () => {
    it('should call service.stopStream with tenantId and id and return the result', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const expected = { id, status: 'FINISHED' };
      service.stopStream.mockResolvedValue(expected as any);

      const result = await controller.stopStream(tenantId, id);

      expect(service.stopStream).toHaveBeenCalledTimes(1);
      expect(service.stopStream).toHaveBeenCalledWith(tenantId, id);
      expect(result).toBe(expected);
    });
  });

  describe('findPublic', () => {
    it('should call service.findPublic with slug and return the result', async () => {
      const slug = 'test-event-slug';
      const expected = { slug, title: 'Public Event' };
      service.findPublic.mockResolvedValue(expected as any);

      const result = await controller.findPublic(slug, request);

      expect(service.findPublic).toHaveBeenCalledTimes(1);
      expect(service.findPublic).toHaveBeenCalledWith(slug, 'viewer-token');
      expect(result).toBe(expected);
    });
  });

  describe('sendMessage', () => {
    it('should call service.sendMessage with slug and dto and return the result', async () => {
      const slug = 'test-event-slug';
      const dto: SendMessageDto = {
        authorName: 'John Doe',
        content: 'Rest in peace',
      };
      const expected = { id: 'msg-1', ...dto };
      service.sendMessage.mockResolvedValue(expected as any);

      const result = await controller.sendMessage(slug, dto, request);

      expect(service.sendMessage).toHaveBeenCalledTimes(1);
      expect(service.sendMessage).toHaveBeenCalledWith(
        slug,
        dto,
        'viewer-token',
      );
      expect(result).toBe(expected);
    });
  });

  describe('getPublicMessages', () => {
    it('should call service.getPublicMessages with the viewer token', async () => {
      const expected = [{ id: 'msg-1', content: 'Rest in peace' }];
      service.getPublicMessages.mockResolvedValue(expected as any);

      const result = await controller.getPublicMessages(
        'test-event-slug',
        request,
      );

      expect(service.getPublicMessages).toHaveBeenCalledWith(
        'test-event-slug',
        'viewer-token',
      );
      expect(result).toBe(expected);
    });
  });

  describe('sendReaction', () => {
    it('should call service.sendReaction with slug, dto and ip and return the result', async () => {
      const slug = 'test-event-slug';
      const dto: SendReactionDto = { type: 'heart' };
      const ip = '192.168.1.1';
      const expected = { id: 'rxn-1', type: 'heart' };
      service.sendReaction.mockResolvedValue(expected as any);

      const result = await controller.sendReaction(slug, dto, ip, request);

      expect(service.sendReaction).toHaveBeenCalledTimes(1);
      expect(service.sendReaction).toHaveBeenCalledWith(
        slug,
        dto,
        ip,
        'viewer-token',
      );
      expect(result).toBe(expected);
    });
  });

  describe('validateAccessCode', () => {
    it('should call service.validateAccessCode with slug and dto and return the result', async () => {
      const slug = 'test-event-slug';
      const dto: AccessCodeDto = { code: 'ABC123' };
      const expected = { valid: true, eventId: 'event-1' };
      service.validateAccessCode.mockResolvedValue({
        ...expected,
        accessToken: 'new-viewer-token',
      });
      const response = { cookie: jest.fn() } as any;

      const result = await controller.validateAccessCode(slug, dto, response);

      expect(service.validateAccessCode).toHaveBeenCalledTimes(1);
      expect(service.validateAccessCode).toHaveBeenCalledWith(slug, dto);
      expect(response.cookie).toHaveBeenCalledWith(
        'stream_event_access',
        'new-viewer-token',
        { httpOnly: true, path: '/' },
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getMessages', () => {
    it('should call service.getMessages with tenantId and id and return the result', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const expected = [{ id: 'msg-1', content: 'Hello' }];
      service.getMessages.mockResolvedValue(expected as any);

      const result = await controller.getMessages(tenantId, id);

      expect(service.getMessages).toHaveBeenCalledTimes(1);
      expect(service.getMessages).toHaveBeenCalledWith(tenantId, id);
      expect(result).toBe(expected);
    });
  });

  describe('getPendingMessages', () => {
    it('should call service.getPendingMessages with tenantId and id and return the result', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const expected = [{ id: 'msg-pending', content: 'Pending message' }];
      service.getPendingMessages.mockResolvedValue(expected as any);

      const result = await controller.getPendingMessages(tenantId, id);

      expect(service.getPendingMessages).toHaveBeenCalledTimes(1);
      expect(service.getPendingMessages).toHaveBeenCalledWith(tenantId, id);
      expect(result).toBe(expected);
    });
  });

  describe('approveMessage', () => {
    it('should call service.approveMessage with tenantId, id, messageId and the current user id, returning the result', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const messageId = 'msg-1';
      const user = { sub: 'user-1' } as any;
      const expected = { id: messageId, status: 'approved' };
      service.approveMessage.mockResolvedValue(expected as any);

      const result = await controller.approveMessage(
        tenantId,
        id,
        messageId,
        user,
      );

      expect(service.approveMessage).toHaveBeenCalledTimes(1);
      expect(service.approveMessage).toHaveBeenCalledWith(
        tenantId,
        id,
        messageId,
        'user-1',
      );
      expect(result).toBe(expected);
    });
  });

  describe('rejectMessage', () => {
    it('should call service.rejectMessage with tenantId, id, messageId and reason and return the result', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const messageId = 'msg-1';
      const reason = 'Inappropriate content';
      const expected = { id: messageId, status: 'rejected' };
      service.rejectMessage.mockResolvedValue(expected as any);

      const result = await controller.rejectMessage(
        tenantId,
        id,
        messageId,
        reason,
      );

      expect(service.rejectMessage).toHaveBeenCalledTimes(1);
      expect(service.rejectMessage).toHaveBeenCalledWith(
        tenantId,
        id,
        messageId,
        reason,
      );
      expect(result).toBe(expected);
    });

    it('should call service.rejectMessage without reason when not provided', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const messageId = 'msg-1';
      const expected = { id: messageId, status: 'rejected' };
      service.rejectMessage.mockResolvedValue(expected as any);

      const result = await controller.rejectMessage(
        tenantId,
        id,
        messageId,
        undefined,
      );

      expect(service.rejectMessage).toHaveBeenCalledTimes(1);
      expect(service.rejectMessage).toHaveBeenCalledWith(
        tenantId,
        id,
        messageId,
        undefined,
      );
      expect(result).toBe(expected);
    });
  });

  describe('deleteMessage', () => {
    it('should call service.deleteMessage with tenantId, id and messageId and return the result', async () => {
      const tenantId = 'tenant-1';
      const id = 'event-1';
      const messageId = 'msg-1';
      const expected = { id: messageId, deletedAt: new Date() };
      service.deleteMessage.mockResolvedValue(expected as any);

      const result = await controller.deleteMessage(tenantId, id, messageId);

      expect(service.deleteMessage).toHaveBeenCalledTimes(1);
      expect(service.deleteMessage).toHaveBeenCalledWith(
        tenantId,
        id,
        messageId,
      );
      expect(result).toBe(expected);
    });
  });
});
