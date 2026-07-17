import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@zentic/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { DistributedRateLimiterService } from '../streaming/services/distributed-rate-limiter.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let emit: jest.Mock;
  let to: jest.Mock;
  let jwtService: { verifyAsync: jest.Mock };
  let prisma: {
    event: { findFirst: jest.Mock };
    user: { findFirst: jest.Mock };
  };

  const makeSocket = (id: string) => ({
    id,
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    data: {},
    handshake: { auth: {}, headers: {} },
  });

  beforeEach(async () => {
    jwtService = { verifyAsync: jest.fn() };
    prisma = {
      event: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ tenantId: 'tenant-1', isPublic: true }),
      },
      user: { findFirst: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('jwt-secret') },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: DistributedRateLimiterService, useValue: { checkRateLimit: jest.fn().mockResolvedValue(true), buildKey: jest.fn().mockReturnValue('test-key') } },
        { provide: REDIS_CLIENT, useValue: { sadd: jest.fn().mockResolvedValue(1), srem: jest.fn().mockResolvedValue(1), scard: jest.fn().mockResolvedValue(0), expire: jest.fn().mockResolvedValue(1), duplicate: () => ({ sadd: jest.fn().mockResolvedValue(1), srem: jest.fn().mockResolvedValue(1), scard: jest.fn().mockResolvedValue(0), expire: jest.fn().mockResolvedValue(1), subscribe: jest.fn(), on: jest.fn(), psubscribe: jest.fn() }) } },
      ],
    }).compile();

    gateway = module.get(NotificationsGateway);

    emit = jest.fn();
    to = jest.fn().mockReturnValue({ emit });
    (gateway as unknown as { server: { to: jest.Mock } }).server = {
      to,
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('viewer count', () => {
    it('broadcasts count 1 when a single viewer joins', async () => {
      const client = makeSocket('socket-1');

      await gateway.handleJoinEvent(client as any, { eventId: 'event-1' });

      expect(client.join).toHaveBeenCalledWith('event:event-1');
      expect(to).toHaveBeenCalledWith('event:event-1');
      expect(emit).toHaveBeenCalledWith('viewer-count', {
        eventId: 'event-1',
        tenantId: '',
        count: 1,
      });
    });

    it('accumulates count across multiple viewers on the same event', async () => {
      await gateway.handleJoinEvent(makeSocket('socket-1') as any, {
        eventId: 'event-1',
      });
      await gateway.handleJoinEvent(makeSocket('socket-2') as any, {
        eventId: 'event-1',
      });

      expect(emit).toHaveBeenLastCalledWith('viewer-count', {
        eventId: 'event-1',
        tenantId: '',
        count: 2,
      });
    });

    it('rejects an anonymous viewer from a private event', async () => {
      prisma.event.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
        isPublic: false,
      });
      const client = makeSocket('anonymous');

      await expect(
        gateway.handleJoinEvent(client as any, { eventId: 'event-1' }),
      ).rejects.toThrow('No autorizado');
      expect(client.join).not.toHaveBeenCalled();
    });

    it('allows a private viewer with a token scoped to the event', async () => {
      prisma.event.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
        isPublic: false,
      });
      jwtService.verifyAsync.mockResolvedValue({
        type: 'stream-access',
        eventId: 'event-1',
      });
      const client = makeSocket('viewer');
      client.handshake.headers = {
        cookie: 'stream_event_access=viewer-token',
      };

      await gateway.handleJoinEvent(client as any, { eventId: 'event-1' });

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'viewer-token',
        expect.objectContaining({
          audience: 'stream-viewer',
          issuer: 'zentic',
        }),
      );
      expect(client.join).toHaveBeenCalledWith('event:event-1');
    });

    it('decrements the count when a viewer leaves', async () => {
      const client1 = makeSocket('socket-1');
      const client2 = makeSocket('socket-2');
      await gateway.handleJoinEvent(client1 as any, { eventId: 'event-1' });
      await gateway.handleJoinEvent(client2 as any, { eventId: 'event-1' });

      await gateway.handleLeaveEvent(client1 as any, { eventId: 'event-1' });

      expect(client1.leave).toHaveBeenCalledWith('event:event-1');
      expect(emit).toHaveBeenLastCalledWith('viewer-count', {
        eventId: 'event-1',
        tenantId: '',
        count: 1,
      });
    });

    it('decrements the count when a viewer disconnects', async () => {
      const client = makeSocket('socket-1');
      await gateway.handleJoinEvent(client as any, { eventId: 'event-1' });

      await gateway.handleDisconnect(client as any);

      expect(emit).toHaveBeenLastCalledWith('viewer-count', {
        eventId: 'event-1',
        tenantId: '',
        count: 0,
      });
    });

    it('does not broadcast on disconnect if the socket never joined an event', async () => {
      await gateway.handleDisconnect(makeSocket('socket-unknown') as any);

      expect(emit).not.toHaveBeenCalled();
    });

    it('excludes an operator joining admin mode from the viewer count', async () => {
      const client = makeSocket('socket-1');
      client.data = {
        user: {
          sub: 'user-1',
          email: 'operator@example.com',
          role: UserRole.OPERATOR,
          tenantId: 'tenant-1',
          permissions: ['streaming:moderate'],
        },
      };
      await gateway.handleJoinEvent(client as any, { eventId: 'event-1' });

      await gateway.handleJoinAdmin(client as any, { eventId: 'event-1' });

      expect(client.join).toHaveBeenCalledWith('event:event-1:admin');
      expect(emit).toHaveBeenLastCalledWith('viewer-count', {
        eventId: 'event-1',
        tenantId: '',
        count: 0,
      });
    });

    it('rejects an anonymous client joining an admin room', async () => {
      await expect(
        gateway.handleJoinAdmin(makeSocket('anonymous') as any, {
          eventId: 'event-1',
        }),
      ).rejects.toThrow('No autorizado');
    });

    it('rejects a moderator from a different tenant', async () => {
      const client = makeSocket('socket-2');
      client.data = {
        user: {
          sub: 'user-2',
          email: 'operator@example.com',
          role: UserRole.OPERATOR,
          tenantId: 'tenant-2',
          permissions: ['streaming:moderate'],
        },
      };

      await expect(
        gateway.handleJoinAdmin(client as any, { eventId: 'event-1' }),
      ).rejects.toThrow('No autorizado');
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('broadcast helpers', () => {
    it('broadcastNewMessage emits new-message to the event room', () => {
      const payload = {
        eventId: 'event-1',
        tenantId: 'tenant-1',
        message: {
          id: 'm1',
          authorName: 'Ana',
          content: 'Hola',
          iconType: null,
          createdAt: new Date().toISOString(),
        },
      };

      gateway.broadcastNewMessage('event-1', payload);

      expect(to).toHaveBeenCalledWith('event:event-1');
      expect(emit).toHaveBeenCalledWith('new-message', payload);
    });

    it('broadcastStreamStatus emits stream-status to the event room', () => {
      const payload = {
        eventId: 'event-1',
        tenantId: 'tenant-1',
        status: 'LIVE' as any,
      };

      gateway.broadcastStreamStatus('event-1', payload);

      expect(to).toHaveBeenCalledWith('event:event-1');
      expect(emit).toHaveBeenCalledWith('stream-status', payload);
    });

    it('broadcastMessagePending emits message-pending only to the admin room', () => {
      const payload = {
        eventId: 'event-1',
        tenantId: 'tenant-1',
        message: {
          id: 'm1',
          authorName: 'Ana',
          content: 'Hola',
          iconType: null,
          createdAt: new Date().toISOString(),
        },
      };

      gateway.broadcastMessagePending('event-1', payload);

      expect(to).toHaveBeenCalledWith('event:event-1:admin');
      expect(emit).toHaveBeenCalledWith('message-pending', payload);
    });
  });
});
