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
  message: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  lead: { create: jest.fn(), findMany: jest.fn() },
  deceased: { create: jest.fn(), findFirst: jest.fn() },
  room: { findFirst: jest.fn() },
  client: { findFirst: jest.fn() },
  user: { findFirst: jest.fn() },
};

describe('StreamingRepository — multi-tenant isolation', () => {
  let repository: StreamingRepository;

  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';
  const eventA = { id: 'event-a', tenantId: tenantA, deletedAt: null };
  const eventB = { id: 'event-b', tenantId: tenantB, deletedAt: null };
  const msgA = {
    id: 'msg-a',
    eventId: 'event-a',
    tenantId: tenantA,
    deletedAt: null,
  };
  const msgB = {
    id: 'msg-b',
    eventId: 'event-b',
    tenantId: tenantB,
    deletedAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamingRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<StreamingRepository>(StreamingRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ── Event writes ─────────────────────────────────────────────────

  describe('update', () => {
    it('incluye tenantId en where', async () => {
      mockPrisma.event.update.mockResolvedValue(eventA);
      await repository.update(tenantA, 'event-a', { title: 'X' });
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-a', tenantId: tenantA },
        data: { title: 'X' },
      });
    });
  });

  describe('softDelete', () => {
    it('incluye tenantId en where', async () => {
      mockPrisma.event.update.mockResolvedValue(eventA);
      await repository.softDelete(tenantA, 'event-a');
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-a', tenantId: tenantA },
        data: { deletedAt: expect.any(Date), status: 'CANCELLED' },
      });
    });
  });

  // ── Message writes ───────────────────────────────────────────────

  describe('approveMessage', () => {
    it('incluye tenantId + eventId + messageId en where', async () => {
      mockPrisma.message.update.mockResolvedValue(msgA);
      await repository.approveMessage(tenantA, 'event-a', 'msg-a', 'user-1');
      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-a', eventId: 'event-a', tenantId: tenantA },
        data: {
          status: 'APPROVED',
          approvedBy: 'user-1',
          approvedAt: expect.any(Date),
        },
      });
    });
  });

  describe('rejectMessage', () => {
    it('incluye tenantId en where', async () => {
      mockPrisma.message.update.mockResolvedValue(msgA);
      await repository.rejectMessage(tenantA, 'event-a', 'msg-a');
      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-a', eventId: 'event-a', tenantId: tenantA },
        data: { status: 'REJECTED', rejectedReason: null },
      });
    });
  });

  describe('softDeleteMessage', () => {
    it('incluye tenantId en where', async () => {
      mockPrisma.message.update.mockResolvedValue(msgA);
      await repository.softDeleteMessage(tenantA, 'event-a', 'msg-a');
      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-a', eventId: 'event-a', tenantId: tenantA },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  // ── Entity lookups ───────────────────────────────────────────────

  describe('findDeceasedByTenant', () => {
    it('retorna null para difunto de otro tenant', async () => {
      mockPrisma.deceased.findFirst.mockResolvedValueOnce(null);
      const result = await repository.findDeceasedByTenant(tenantA, 'dec-b');
      expect(mockPrisma.deceased.findFirst).toHaveBeenCalledWith({
        where: { id: 'dec-b', tenantId: tenantA, deletedAt: null },
      });
      expect(result).toBeNull();
    });
  });

  describe('findRoomByTenant', () => {
    it('retorna null para sala de otro tenant', async () => {
      mockPrisma.room.findFirst.mockResolvedValueOnce(null);
      const result = await repository.findRoomByTenant(tenantA, 'room-b');
      expect(mockPrisma.room.findFirst).toHaveBeenCalledWith({
        where: { id: 'room-b', tenantId: tenantA, deletedAt: null },
      });
      expect(result).toBeNull();
    });
  });

  describe('findClientByTenant', () => {
    it('retorna null para cliente de otro tenant', async () => {
      mockPrisma.client.findFirst.mockResolvedValueOnce(null);
      const result = await repository.findClientByTenant(tenantA, 'client-b');
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-b', tenantId: tenantA, deletedAt: null },
      });
      expect(result).toBeNull();
    });
  });

  describe('findUserByTenant', () => {
    it('retorna null para usuario de otro tenant', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      const result = await repository.findUserByTenant(tenantA, 'user-b');
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-b', tenantId: tenantA, deletedAt: null },
      });
      expect(result).toBeNull();
    });
  });

  // ── Reads ────────────────────────────────────────────────────────

  describe('findById', () => {
    it('retorna null para evento de otro tenant', async () => {
      mockPrisma.event.findFirst.mockResolvedValueOnce(null);
      const result = await repository.findById(tenantA, 'event-b');
      expect(mockPrisma.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'event-b', tenantId: tenantA, deletedAt: null },
        include: expect.anything(),
      });
      expect(result).toBeNull();
    });
  });

  describe('findMessagesByEvent', () => {
    it('incluye tenantId en where', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);
      await repository.findMessagesByEvent(tenantA, 'event-a');
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: tenantA,
          eventId: 'event-a',
          deletedAt: null,
          status: 'APPROVED',
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findMessagesPendingModeration', () => {
    it('incluye tenantId en where', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);
      await repository.findMessagesPendingModeration(tenantA, 'event-a');
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: tenantA,
          eventId: 'event-a',
          status: 'PENDING',
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findLeadsWithEmailByEvent', () => {
    it('incluye tenantId en where', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      await repository.findLeadsWithEmailByEvent(tenantA, 'event-a');
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: tenantA,
          eventId: 'event-a',
          email: { not: null },
          deletedAt: null,
        },
        select: { email: true, name: true },
      });
    });
  });

  describe('updateViewerCount', () => {
    it('incluye tenantId en where', async () => {
      mockPrisma.event.update.mockResolvedValue(eventA);
      await repository.updateViewerCount(tenantA, 'event-a', 5);
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-a', tenantId: tenantA },
        data: { viewerCount: 5 },
      });
    });
  });

  // ── Cross-tenant rejection ─────────────────────────────────────────

  describe('cross-tenant isolation — tenantA cannot access tenantB data', () => {
    it('findById retorna null', async () => {
      mockPrisma.event.findFirst.mockResolvedValueOnce(null);
      const result = await repository.findById(tenantA, 'event-b');
      expect(result).toBeNull();
    });

    it('update no actualiza (Prisma lanza P2025 con tenantId incorrecto)', async () => {
      mockPrisma.event.update.mockRejectedValue(
        Object.assign(new Error('Record to update not found.'), {
          code: 'P2025',
        }),
      );
      await expect(
        repository.update(tenantA, 'event-b', { title: 'X' }),
      ).rejects.toThrow();
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-b', tenantId: tenantA },
        data: expect.anything(),
      });
    });

    it('softDelete no elimina', async () => {
      mockPrisma.event.update.mockRejectedValue(
        Object.assign(new Error('Record to update not found.'), {
          code: 'P2025',
        }),
      );
      await expect(repository.softDelete(tenantA, 'event-b')).rejects.toThrow();
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-b', tenantId: tenantA },
        data: expect.anything(),
      });
    });

    it('approveMessage no modifica mensaje de otro tenant', async () => {
      mockPrisma.message.update.mockRejectedValue(
        Object.assign(new Error('Record to update not found.'), {
          code: 'P2025',
        }),
      );
      await expect(
        repository.approveMessage(tenantA, 'event-b', 'msg-b', 'user-1'),
      ).rejects.toThrow();
    });

    it('findLeadsWithEmailByEvent no retorna leads de otro tenant', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      const result = await repository.findLeadsWithEmailByEvent(
        tenantA,
        'event-b',
      );
      expect(result).toEqual([]);
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: tenantA }),
        }),
      );
    });
  });
});
