import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StreamingRepository } from './streaming.repository';

const mockPrisma = {
  event: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  lead: {
    create: jest.fn(),
  },
  deceased: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};

describe('StreamingRepository', () => {
  let repository: StreamingRepository;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamingRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<StreamingRepository>(StreamingRepository);
    prisma = module.get(PrismaService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findManyByTenant', () => {
    const tenantId = 'tenant-1';
    const mockEvents = [
      {
        id: 'event-1',
        title: 'Test Event',
        tenantId,
        scheduledAt: new Date('2026-07-15T10:00:00Z'),
        deceased: {
          id: 'dec-1',
          firstName: 'John',
          lastName: 'Doe',
          photoUrl: 'photo.jpg',
        },
        room: {
          id: 'room-1',
          name: 'Sala A',
          venue: { id: 'ven-1', name: 'Funeraria Centro' },
        },
        client: { id: 'client-1', name: 'Maria Garcia' },
        assignedTo: { id: 'user-1', email: 'operator@test.com' },
        _count: { messages: 5, leads: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should call event.findMany with correct where, include, and orderBy', async () => {
      (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);

      const result = await repository.findManyByTenant(tenantId);

      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { tenantId, deletedAt: null },
        include: {
          deceased: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
              venue: { select: { id: true, name: true } },
            },
          },
          client: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, email: true } },
          _count: { select: { messages: true, leads: true } },
        },
        orderBy: { scheduledAt: 'desc' },
      });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('findById', () => {
    const tenantId = 'tenant-1';
    const mockEvent = {
      id: 'event-1',
      title: 'Test Event',
      tenantId,
      scheduledAt: new Date('2026-07-15T10:00:00Z'),
      deceased: {
        id: 'dec-1',
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 'photo.jpg',
        birthDate: null,
        deathDate: null,
      },
      room: {
        id: 'room-1',
        name: 'Sala A',
        venue: { id: 'ven-1', name: 'Funeraria Centro' },
      },
      client: {
        id: 'client-1',
        name: 'Maria Garcia',
        phone: '555-0100',
        email: 'maria@test.com',
      },
      assignedTo: { id: 'user-1', email: 'operator@test.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should call event.findFirst with correct where clause and includes', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue(mockEvent);

      const result = await repository.findById(tenantId, 'event-1');

      expect(prisma.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'event-1', tenantId, deletedAt: null },
        include: {
          deceased: true,
          room: { include: { venue: true } },
          client: {
            select: { id: true, name: true, phone: true, email: true },
          },
          assignedTo: { select: { id: true, email: true } },
        },
      });
      expect(result).toEqual(mockEvent);
    });

    it('should return null when no event is found', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById(tenantId, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    const slug = 'john-doe-memorial';
    const mockEvent = {
      id: 'event-1',
      slug,
      title: 'Test Event',
      deceased: {
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1950-01-01'),
        deathDate: new Date('2026-07-10'),
        photoUrl: 'photo.jpg',
        biography: 'A wonderful person',
        epitaph: 'Forever remembered',
      },
      tenant: {
        name: 'Funeraria Centro',
        brandConfig: { primaryColor: '#000', logoUrl: 'logo.png' },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should call event.findUnique with correct where and include', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);

      const result = await repository.findBySlug(slug);

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { slug },
        include: {
          deceased: {
            select: {
              firstName: true,
              lastName: true,
              birthDate: true,
              deathDate: true,
              photoUrl: true,
              biography: true,
              epitaph: true,
            },
          },
          tenant: {
            select: {
              name: true,
              brandConfig: true,
            },
          },
        },
      });
      expect(result).toEqual(mockEvent);
    });

    it('should return null when slug does not match', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const data = {
      title: 'New Event',
      tenant: { connect: { id: 'tenant-1' } },
      scheduledAt: new Date('2026-08-01T10:00:00Z'),
      deceased: { connect: { id: 'dec-1' } },
      room: { connect: { id: 'room-1' } },
    };
    const mockEvent = {
      id: 'event-new',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should call event.create with the provided data', async () => {
      (prisma.event.create as jest.Mock).mockResolvedValue(mockEvent);

      const result = await repository.create(data as any);

      expect(prisma.event.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(mockEvent);
    });
  });

  describe('update', () => {
    const tenantId = 'tenant-1';
    const data = { title: 'Updated Title' };
    const mockEvent = {
      id: 'event-1',
      title: 'Updated Title',
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should call event.update with correct where and data', async () => {
      (prisma.event.update as jest.Mock).mockResolvedValue(mockEvent);

      const result = await repository.update(tenantId, 'event-1', data);

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data,
      });
      expect(result).toEqual(mockEvent);
    });
  });

  describe('softDelete', () => {
    const tenantId = 'tenant-1';
    const mockEvent = {
      id: 'event-1',
      deletedAt: new Date(),
      status: 'CANCELLED',
      tenantId,
    };

    it('should update event with deletedAt and status CANCELLED', async () => {
      (prisma.event.update as jest.Mock).mockResolvedValue(mockEvent);

      const result = await repository.softDelete(tenantId, 'event-1');

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { deletedAt: expect.any(Date), status: 'CANCELLED' },
      });
      expect(result).toEqual(mockEvent);
    });
  });

  describe('findByRoomAndTimeOverlap', () => {
    const tenantId = 'tenant-1';
    const roomId = 'room-1';
    const scheduledAt = new Date('2026-07-15T10:00:00Z');
    const estimatedDuration = 120; // 2 hours
    const mockOverlapEvent = {
      id: 'event-2',
      title: 'Overlapping Event',
      roomId,
      tenantId,
    };

    it('should find overlapping events without excludeId', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue(mockOverlapEvent);

      const result = await repository.findByRoomAndTimeOverlap(
        tenantId,
        roomId,
        scheduledAt,
        estimatedDuration,
      );

      const expectedEndTime = new Date(
        scheduledAt.getTime() + estimatedDuration * 60000,
      );

      expect(prisma.event.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          roomId,
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'FINISHED'] },
          id: undefined,
          scheduledAt: { lt: expectedEndTime },
        },
      });
      expect(result).toEqual(mockOverlapEvent);
    });

    it('should find overlapping events with excludeId', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByRoomAndTimeOverlap(
        tenantId,
        roomId,
        scheduledAt,
        estimatedDuration,
        'event-1',
      );

      const expectedEndTime = new Date(
        scheduledAt.getTime() + estimatedDuration * 60000,
      );

      expect(prisma.event.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          roomId,
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'FINISHED'] },
          id: { not: 'event-1' },
          scheduledAt: { lt: expectedEndTime },
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('findMessagesByEvent', () => {
    const tenantId = 'tenant-1';
    const eventId = 'event-1';
    const mockMessages = [
      {
        id: 'msg-1',
        content: 'Message 1',
        status: 'APPROVED',
        tenantId,
        eventId,
        createdAt: new Date(),
      },
      {
        id: 'msg-2',
        content: 'Message 2',
        status: 'APPROVED',
        tenantId,
        eventId,
        createdAt: new Date(),
      },
    ];

    it('should default to APPROVED status when no status provided', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await repository.findMessagesByEvent(tenantId, eventId);

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          eventId,
          deletedAt: null,
          status: 'APPROVED',
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(mockMessages);
    });

    it('should filter by custom status when provided', async () => {
      const pendingMessages = [
        {
          id: 'msg-3',
          content: 'Pending Message',
          status: 'PENDING',
          tenantId,
          eventId,
          createdAt: new Date(),
        },
      ];
      (prisma.message.findMany as jest.Mock).mockResolvedValue(pendingMessages);

      const result = await repository.findMessagesByEvent(
        tenantId,
        eventId,
        'PENDING',
      );

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          eventId,
          deletedAt: null,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(pendingMessages);
    });
  });

  describe('findMessagesPendingModeration', () => {
    const tenantId = 'tenant-1';
    const eventId = 'event-1';
    const mockMessages = [
      {
        id: 'msg-1',
        content: 'Pending',
        status: 'PENDING',
        tenantId,
        eventId,
        createdAt: new Date(),
      },
    ];

    it('should call message.findMany with PENDING status', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await repository.findMessagesPendingModeration(
        tenantId,
        eventId,
      );

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          eventId,
          status: 'PENDING',
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(mockMessages);
    });
  });

  describe('createMessage', () => {
    const data = {
      content: 'Test message',
      authorName: 'John',
      status: 'PENDING',
      event: { connect: { id: 'event-1' } },
      tenant: { connect: { id: 'tenant-1' } },
    };
    const mockMessage = { id: 'msg-new', ...data, createdAt: new Date() };

    it('should call message.create with the provided data', async () => {
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await repository.createMessage(data as any);

      expect(prisma.message.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(mockMessage);
    });
  });

  describe('approveMessage', () => {
    const eventId = 'event-1';
    const messageId = 'msg-1';
    const approvedBy = 'moderator-1';
    const mockMessage = {
      id: messageId,
      status: 'APPROVED',
      approvedBy,
      approvedAt: new Date(),
      eventId,
    };

    it('should update message with APPROVED status, approvedBy and approvedAt', async () => {
      (prisma.message.update as jest.Mock).mockResolvedValue(mockMessage);

      const result = await repository.approveMessage(
        eventId,
        messageId,
        approvedBy,
      );

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId, eventId },
        data: {
          status: 'APPROVED',
          approvedBy,
          approvedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockMessage);
    });
  });

  describe('rejectMessage', () => {
    const eventId = 'event-1';
    const messageId = 'msg-1';

    it('should update message with REJECTED status and no reason', async () => {
      const mockMessage = {
        id: messageId,
        status: 'REJECTED',
        rejectedReason: null,
        eventId,
      };
      (prisma.message.update as jest.Mock).mockResolvedValue(mockMessage);

      const result = await repository.rejectMessage(eventId, messageId);

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId, eventId },
        data: { status: 'REJECTED', rejectedReason: null },
      });
      expect(result).toEqual(mockMessage);
    });

    it('should update message with REJECTED status and reason', async () => {
      const reason = 'Inappropriate content';
      const mockMessage = {
        id: messageId,
        status: 'REJECTED',
        rejectedReason: reason,
        eventId,
      };
      (prisma.message.update as jest.Mock).mockResolvedValue(mockMessage);

      const result = await repository.rejectMessage(eventId, messageId, reason);

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId, eventId },
        data: { status: 'REJECTED', rejectedReason: reason },
      });
      expect(result).toEqual(mockMessage);
    });
  });

  describe('softDeleteMessage', () => {
    const eventId = 'event-1';
    const messageId = 'msg-1';
    const mockMessage = { id: messageId, deletedAt: new Date(), eventId };

    it('should update message with deletedAt', async () => {
      (prisma.message.update as jest.Mock).mockResolvedValue(mockMessage);

      const result = await repository.softDeleteMessage(eventId, messageId);

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId, eventId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual(mockMessage);
    });
  });

  describe('updateViewerCount', () => {
    const eventId = 'event-1';
    const count = 42;
    const mockEvent = { id: eventId, viewerCount: count };

    it('should update event with the given viewerCount', async () => {
      (prisma.event.update as jest.Mock).mockResolvedValue(mockEvent);

      const result = await repository.updateViewerCount(eventId, count);

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: eventId },
        data: { viewerCount: count },
      });
      expect(result).toEqual(mockEvent);
    });
  });

  describe('createLead', () => {
    const data = {
      name: 'Jane Doe',
      email: 'jane@test.com',
      consent: true,
      source: 'streaming',
      event: { connect: { id: 'event-1' } },
      tenant: { connect: { id: 'tenant-1' } },
    };
    const mockLead = { id: 'lead-new', ...data, createdAt: new Date() };

    it('should call lead.create with the provided data', async () => {
      (prisma.lead.create as jest.Mock).mockResolvedValue(mockLead);

      const result = await repository.createLead(data as any);

      expect(prisma.lead.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(mockLead);
    });
  });

  describe('createDeceased', () => {
    const data = {
      firstName: 'John',
      lastName: 'Doe',
      birthDate: new Date('1950-01-01'),
      deathDate: new Date('2026-07-10'),
      tenant: { connect: { id: 'tenant-1' } },
    };
    const mockDeceased = { id: 'dec-new', ...data, createdAt: new Date() };

    it('should call deceased.create with the provided data', async () => {
      (prisma.deceased.create as jest.Mock).mockResolvedValue(mockDeceased);

      const result = await repository.createDeceased(data as any);

      expect(prisma.deceased.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(mockDeceased);
    });
  });

  describe('findDeceasedByTenant', () => {
    const tenantId = 'tenant-1';
    const mockDeceased = {
      id: 'dec-1',
      firstName: 'John',
      lastName: 'Doe',
      tenantId,
      deletedAt: null,
    };

    it('should call deceased.findFirst with correct where clause', async () => {
      (prisma.deceased.findFirst as jest.Mock).mockResolvedValue(mockDeceased);

      const result = await repository.findDeceasedByTenant(tenantId, 'dec-1');

      expect(prisma.deceased.findFirst).toHaveBeenCalledWith({
        where: { id: 'dec-1', tenantId, deletedAt: null },
      });
      expect(result).toEqual(mockDeceased);
    });

    it('should return null when deceased is not found', async () => {
      (prisma.deceased.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findDeceasedByTenant(
        tenantId,
        'non-existent',
      );

      expect(result).toBeNull();
    });
  });
});
