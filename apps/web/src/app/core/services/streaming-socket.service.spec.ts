import { TestBed } from '@angular/core/testing';
import { io } from 'socket.io-client';
import { firstValueFrom, skip, timeout } from 'rxjs';
import { StreamingSocketService, SocketMessage, SocketReaction } from './streaming-socket.service';

vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}));

function createMockSocket() {
  return {
    on: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
  };
}

type MockSocket = ReturnType<typeof createMockSocket>;

function findSocketHandler(mockSocket: MockSocket, event: string) {
  return mockSocket.on.mock.calls.find(
    (call: unknown[]) => (call as [string])[0] === event,
  )?.[1] as (...args: unknown[]) => void;
}

describe('StreamingSocketService', () => {
  let service: StreamingSocketService;
  let mockSocket: MockSocket;

  beforeEach(() => {
    mockSocket = createMockSocket();
    (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
    TestBed.configureTestingModule({ providers: [StreamingSocketService] });
    service = TestBed.inject(StreamingSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('connect', () => {
    it('should create socket connection with correct URL and options', () => {
      service.connect('event-1');

      expect(io).toHaveBeenCalledWith('http://localhost:3000/events', {
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });
    });

    it('should emit join-event on connect', () => {
      service.connect('event-1');

      const connectHandler = findSocketHandler(mockSocket, 'connect');
      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('join-event', {
        eventId: 'event-1',
      });
    });

    it('should emit join-admin when asAdmin is true', () => {
      service.connect('event-1', true);

      const connectHandler = findSocketHandler(mockSocket, 'connect');
      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('join-admin', {
        eventId: 'event-1',
      });
    });

    it('should still emit join-event when asAdmin is true', () => {
      service.connect('event-1', true);

      const connectHandler = findSocketHandler(mockSocket, 'connect');
      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('join-event', {
        eventId: 'event-1',
      });
    });

    it('should not emit join-admin when asAdmin is false', () => {
      service.connect('event-1');

      const connectHandler = findSocketHandler(mockSocket, 'connect');
      connectHandler();

      expect(mockSocket.emit).not.toHaveBeenCalledWith('join-admin', expect.anything());
    });

    it('should register all event listeners', () => {
      service.connect('event-1');

      const registeredEvents = mockSocket.on.mock.calls.map(
        (call: unknown[]) => (call as [string])[0],
      );

      expect(registeredEvents).toEqual(
        expect.arrayContaining([
          'connect',
          'new-message',
          'new-reaction',
          'viewer-count',
          'stream-status',
          'message-pending',
        ]),
      );
    });

    it('should disconnect existing socket before connecting again', () => {
      service.connect('first');
      const firstSocket = mockSocket;

      const secondSocket = createMockSocket();
      (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(secondSocket);

      service.connect('second');

      expect(firstSocket.removeAllListeners).toHaveBeenCalled();
      expect(firstSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should remove all listeners from the socket', () => {
      service.connect('event-1');
      service.disconnect();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    });

    it('should disconnect the socket', () => {
      service.connect('event-1');
      service.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should reset viewer count to 0', () => {
      service.connect('event-1');

      const viewerHandler = findSocketHandler(mockSocket, 'viewer-count');
      viewerHandler({ count: 42 });

      service.disconnect();

      expect(service.viewerCount$).toBeDefined();
      let emitted: number | undefined;
      service.viewerCount$.subscribe((v) => {
        emitted = v;
      });
      expect(emitted).toBe(0);
    });

    it('should do nothing when no socket is connected', () => {
      expect(() => service.disconnect()).not.toThrow();
    });
  });

  describe('newMessage$', () => {
    it('should emit a SocketMessage when new-message event fires', async () => {
      service.connect('event-1');

      const handler = findSocketHandler(mockSocket, 'new-message');
      const message: SocketMessage = {
        id: 'msg-1',
        authorName: 'Alice',
        content: 'Descansa en paz',
        iconType: 'heart',
        createdAt: '2026-01-01T00:00:00Z',
      };

      const result$ = firstValueFrom(service.newMessage$.pipe(timeout(500)));
      handler({ message });

      const result = await result$;
      expect(result).toEqual(message);
    });
  });

  describe('newReaction$', () => {
    it('should emit a SocketReaction when new-reaction event fires', async () => {
      service.connect('event-1');

      const handler = findSocketHandler(mockSocket, 'new-reaction');
      const reaction: SocketReaction = { type: 'like', icon: '👍' };

      const result$ = firstValueFrom(service.newReaction$.pipe(timeout(500)));
      handler({ reaction });

      const result = await result$;
      expect(result).toEqual(reaction);
    });
  });

  describe('viewerCount$', () => {
    it('should emit a number when viewer-count event fires', async () => {
      service.connect('event-1');

      const handler = findSocketHandler(mockSocket, 'viewer-count');

      const result$ = firstValueFrom(service.viewerCount$.pipe(skip(1), timeout(500)));
      handler({ count: 15 });

      const result = await result$;
      expect(result).toBe(15);
    });

    it('should start at 0', async () => {
      service.connect('event-1');

      const result = await firstValueFrom(service.viewerCount$.pipe(timeout(500)));
      expect(result).toBe(0);
    });
  });

  describe('streamStatus$', () => {
    it('should emit a string when stream-status event fires', async () => {
      service.connect('event-1');

      const handler = findSocketHandler(mockSocket, 'stream-status');

      const result$ = firstValueFrom(service.streamStatus$.pipe(timeout(500)));
      handler({ status: 'LIVE' });

      const result = await result$;
      expect(result).toBe('LIVE');
    });
  });

  describe('messagePending$', () => {
    it('should emit a SocketMessage when message-pending event fires', async () => {
      service.connect('event-1');

      const handler = findSocketHandler(mockSocket, 'message-pending');
      const message: SocketMessage = {
        id: 'msg-pending-1',
        authorName: 'Bob',
        content: 'Por revisar',
        iconType: null,
        createdAt: '2026-06-01T12:00:00Z',
      };

      const result$ = firstValueFrom(service.messagePending$.pipe(timeout(500)));
      handler({ message });

      const result = await result$;
      expect(result).toEqual(message);
    });
  });

  describe('ngOnDestroy', () => {
    it('should call disconnect', () => {
      service.connect('event-1');
      const disconnectSpy = vi.spyOn(service, 'disconnect');

      service.ngOnDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});
