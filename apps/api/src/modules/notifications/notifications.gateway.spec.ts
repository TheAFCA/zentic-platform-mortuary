import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let emit: jest.Mock;
  let to: jest.Mock;

  const makeSocket = (id: string) => ({
    id,
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsGateway],
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

      gateway.handleDisconnect(client as any);

      expect(emit).toHaveBeenLastCalledWith('viewer-count', {
        eventId: 'event-1',
        tenantId: '',
        count: 0,
      });
    });

    it('does not broadcast on disconnect if the socket never joined an event', () => {
      gateway.handleDisconnect(makeSocket('socket-unknown') as any);

      expect(emit).not.toHaveBeenCalled();
    });

    it('excludes an operator joining admin mode from the viewer count', async () => {
      const client = makeSocket('socket-1');
      await gateway.handleJoinEvent(client as any, { eventId: 'event-1' });

      await gateway.handleJoinAdmin(client as any, { eventId: 'event-1' });

      expect(client.join).toHaveBeenCalledWith('event:event-1:admin');
      expect(emit).toHaveBeenLastCalledWith('viewer-count', {
        eventId: 'event-1',
        tenantId: '',
        count: 0,
      });
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
