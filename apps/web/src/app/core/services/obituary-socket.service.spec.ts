import { TestBed } from '@angular/core/testing';
import { io } from 'socket.io-client';
import { firstValueFrom, timeout } from 'rxjs';
import { ObituarySocketService, ObituarySocketMessage } from './obituary-socket.service';

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

describe('ObituarySocketService', () => {
  let service: ObituarySocketService;
  let mockSocket: MockSocket;

  beforeEach(() => {
    mockSocket = createMockSocket();
    (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
    TestBed.configureTestingModule({ providers: [ObituarySocketService] });
    service = TestBed.inject(ObituarySocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('connect', () => {
    it('should create a socket connection to the /events namespace', () => {
      service.connect('obituary-1');

      expect(io).toHaveBeenCalledWith('http://localhost:3000/events', {
        transports: ['websocket', 'polling'],
      });
    });

    it('should emit join-obituary with the obituaryId on connect', () => {
      service.connect('obituary-1');

      const connectHandler = findSocketHandler(mockSocket, 'connect');
      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('join-obituary', {
        obituaryId: 'obituary-1',
      });
    });

    it('should disconnect an existing socket before connecting again', () => {
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
    it('should remove listeners and disconnect the socket', () => {
      service.connect('obituary-1');
      service.disconnect();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should do nothing when no socket is connected', () => {
      expect(() => service.disconnect()).not.toThrow();
    });
  });

  describe('newMessage$', () => {
    it('should emit an ObituarySocketMessage when new-message fires', async () => {
      service.connect('obituary-1');

      const handler = findSocketHandler(mockSocket, 'new-message');
      const message: ObituarySocketMessage = {
        id: 'msg-1',
        authorName: 'Ana Gómez',
        content: 'Que en paz descanse',
        iconType: 'CANDLE',
        createdAt: '2026-07-01T00:00:00Z',
      };

      const result$ = firstValueFrom(service.newMessage$.pipe(timeout(500)));
      handler({ message });

      const result = await result$;
      expect(result).toEqual(message);
    });
  });

  describe('ngOnDestroy', () => {
    it('should call disconnect', () => {
      service.connect('obituary-1');
      const disconnectSpy = vi.spyOn(service, 'disconnect');

      service.ngOnDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});
