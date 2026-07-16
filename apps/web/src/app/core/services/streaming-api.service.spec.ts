import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  StreamingApiService,
  StreamingEvent,
  PublicEvent,
  Message,
  CreateEventInput,
  SendMessageInput,
  SendReactionInput,
  AccessCodeInput,
} from './streaming-api.service';
import { environment } from '../../../environments/environment';
import { EventStatus } from '@zentic/shared-types';

describe('StreamingApiService', () => {
  let service: StreamingApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const mockEvent: StreamingEvent = {
    id: 'event-1',
    title: 'Test Event',
    slug: 'test-event',
    description: 'A test event',
    ceremonyType: 'funeral',
    status: EventStatus.SCHEDULED,
    scheduledAt: '2026-07-12T10:00:00Z',
    startedAt: null,
    finishedAt: null,
    estimatedDuration: 60,
    isPublic: true,
    streamKey: null,
    rtmpUrl: null,
    recordingUrl: null,
    playbackUrl: null,
    viewerCount: 0,
    moderationMode: 'auto',
    createdAt: '2026-07-01T12:00:00Z',
    deceased: {
      id: 'dec-1',
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1950-01-01',
      deathDate: '2026-06-30',
      photoUrl: null,
      biography: null,
      epitaph: null,
    },
    room: null,
    client: null,
    assignedTo: null,
  };

  const mockPublicEvent: PublicEvent = {
    id: 'event-1',
    title: 'Test Event',
    slug: 'test-event',
    status: EventStatus.SCHEDULED,
    ceremonyType: 'funeral',
    scheduledAt: '2026-07-12T10:00:00Z',
    startedAt: null,
    finishedAt: null,
    recordingUrl: null,
    playbackUrl: null,
    recordingReady: false,
    isPublic: true,
    viewerCount: 0,
    deceased: {
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1950-01-01',
      deathDate: '2026-06-30',
      photoUrl: null,
      biography: null,
      epitaph: null,
    },
    tenant: {
      name: 'Test Funeral Home',
      brandConfig: null,
    },
  };

  const mockMessage: Message = {
    id: 'msg-1',
    authorName: 'Jane Doe',
    content: 'Rest in peace',
    iconType: 'heart',
    status: 'approved',
    createdAt: '2026-07-12T11:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StreamingApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('findAll', () => {
    it('should perform a GET against /events and return events', () => {
      const mockEvents = [mockEvent];

      service.findAll().subscribe((events) => {
        expect(events).toEqual(mockEvents);
      });

      const req = httpMock.expectOne(`${baseUrl}/events`);
      expect(req.request.method).toBe('GET');
      expect(req.request.body).toBeNull();
      req.flush(mockEvents);
    });

    it('should handle an empty array response', () => {
      service.findAll().subscribe((events) => {
        expect(events).toEqual([]);
      });

      const req = httpMock.expectOne(`${baseUrl}/events`);
      req.flush([]);
    });
  });

  describe('findOne', () => {
    it('should perform a GET against /events/{id} and return the event', () => {
      service.findOne('event-1').subscribe((event) => {
        expect(event).toEqual(mockEvent);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockEvent);
    });

    it('should throw on a 404', () => {
      service.findOne('nonexistent').subscribe({
        error: (err) => expect(err.status).toBe(404),
      });

      const req = httpMock.expectOne(`${baseUrl}/events/nonexistent`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getCredentials', () => {
    it('should request credentials from the protected endpoint', () => {
      const credentials = {
        streamKey: 'stream-secret',
        rtmpUrl: 'rtmps://example.com/live',
        revealed: false,
      };

      service.getCredentials('event-1').subscribe((result) => {
        expect(result).toEqual(credentials);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/credentials`);
      expect(req.request.method).toBe('GET');
      req.flush(credentials);
    });
  });

  describe('credential actions', () => {
    it('reveals credentials through an explicit POST', () => {
      service.revealCredentials('event-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/credentials/reveal`);
      expect(req.request.method).toBe('POST');
      req.flush({ streamKey: 'secret', rtmpUrl: 'rtmps://example', revealed: true });
    });

    it('rotates credentials through an explicit POST', () => {
      service.rotateStreamKey('event-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/credentials/rotate`);
      expect(req.request.method).toBe('POST');
      req.flush({ streamKey: 'new-secret', rtmpUrl: 'rtmps://example', revealed: true });
    });

    it('audits stream key copies', () => {
      service.auditStreamKeyCopy('event-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/credentials/audit-copy`);
      expect(req.request.method).toBe('POST');
      req.flush({ recorded: true });
    });
  });

  describe('findPublic', () => {
    it('should perform a GET against /events/{slug}/public and return public event', () => {
      service.findPublic('test-event').subscribe((event) => {
        expect(event).toEqual(mockPublicEvent);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/test-event/public`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPublicEvent);
    });
  });

  describe('getPlayback', () => {
    it('requests a fresh playback URL for the current viewer', () => {
      service.getPlayback('test-event').subscribe((result) => {
        expect(result.url).toContain('stream.mux.com');
      });

      const req = httpMock.expectOne(`${baseUrl}/events/test-event/playback`);
      expect(req.request.method).toBe('GET');
      req.flush({ url: 'https://stream.mux.com/id.m3u8?token=jwt' });
    });
  });

  describe('create', () => {
    it('should perform a POST against /events with the dto and return created event', () => {
      const dto: CreateEventInput = {
        title: 'New Event',
        ceremonyType: 'funeral',
        scheduledAt: '2026-08-01T10:00:00Z',
      };

      service.create(dto).subscribe((event) => {
        expect(event).toEqual(mockEvent);
      });

      const req = httpMock.expectOne(`${baseUrl}/events`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockEvent);
    });

    it('should pass all optional fields when provided', () => {
      const dto: CreateEventInput = {
        title: 'Full Event',
        ceremonyType: 'memorial',
        scheduledAt: '2026-08-01T10:00:00Z',
        description: 'Full description',
        roomId: 'room-1',
        clientId: 'client-1',
        assignedToId: 'user-1',
        estimatedDuration: 90,
        isPublic: false,
        accessCode: 'ABC123',
        moderationMode: 'manual',
        deceased: {
          firstName: 'Jane',
          lastName: 'Smith',
          birthDate: '1960-05-10',
          deathDate: '2026-07-01',
        },
      };

      service.create(dto).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/events`);
      expect(req.request.body).toEqual(dto);
      req.flush(mockEvent);
    });
  });

  describe('update', () => {
    it('should perform a PATCH against /events/{id} with partial dto', () => {
      const dto: Partial<CreateEventInput> = { title: 'Updated Title' };

      service.update('event-1', dto).subscribe((event) => {
        expect(event).toEqual(mockEvent);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush(mockEvent);
    });
  });

  describe('remove', () => {
    it('should perform a DELETE against /events/{id} and return void', () => {
      service.remove('event-1').subscribe((res) => {
        expect(res).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('startStream', () => {
    it('should perform a POST against /events/{id}/start', () => {
      service.startStream('event-1').subscribe((event) => {
        expect(event).toEqual(mockEvent);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/start`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockEvent);
    });
  });

  describe('stopStream', () => {
    it('should perform a POST against /events/{id}/stop', () => {
      service.stopStream('event-1').subscribe((event) => {
        expect(event).toEqual(mockEvent);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/stop`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockEvent);
    });
  });

  describe('getMessages', () => {
    it('should perform a GET against /events/{id}/messages', () => {
      const mockMessages = [mockMessage];

      service.getMessages('event-1').subscribe((messages) => {
        expect(messages).toEqual(mockMessages);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/messages`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMessages);
    });
  });

  describe('getPendingMessages', () => {
    it('should perform a GET against /events/{id}/messages/pending', () => {
      const mockMessages = [mockMessage];

      service.getPendingMessages('event-1').subscribe((messages) => {
        expect(messages).toEqual(mockMessages);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/messages/pending`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMessages);
    });
  });

  describe('sendMessage', () => {
    it('should perform a POST against /events/{slug}/messages with the dto', () => {
      const dto: SendMessageInput = {
        authorName: 'Jane Doe',
        content: 'Rest in peace',
      };

      service.sendMessage('test-event', dto).subscribe((message) => {
        expect(message).toEqual(mockMessage);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/test-event/messages`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockMessage);
    });

    it('should include optional iconType in the body', () => {
      const dto: SendMessageInput = {
        authorName: 'Jane Doe',
        content: 'Rest in peace',
        iconType: 'heart',
      };

      service.sendMessage('test-event', dto).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/events/test-event/messages`);
      expect(req.request.body).toEqual(dto);
      req.flush(mockMessage);
    });
  });

  describe('getPublicMessages', () => {
    it('should perform a GET against the public messages endpoint', () => {
      service.getPublicMessages('test-event').subscribe((messages) => {
        expect(messages).toEqual([mockMessage]);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/test-event/public/messages`);
      expect(req.request.method).toBe('GET');
      req.flush([mockMessage]);
    });
  });

  describe('approveMessage', () => {
    it('should perform a PATCH against /events/{eventId}/messages/{messageId}/approve', () => {
      service.approveMessage('event-1', 'msg-1').subscribe((message) => {
        expect(message).toEqual(mockMessage);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/messages/msg-1/approve`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush(mockMessage);
    });
  });

  describe('rejectMessage', () => {
    it('should perform a PATCH against /events/{eventId}/messages/{messageId}/reject', () => {
      service.rejectMessage('event-1', 'msg-1', 'Spam').subscribe((message) => {
        expect(message).toEqual(mockMessage);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/messages/msg-1/reject`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ reason: 'Spam' });
      req.flush(mockMessage);
    });

    it('should send undefined reason when not provided', () => {
      service.rejectMessage('event-1', 'msg-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/messages/msg-1/reject`);
      expect(req.request.body).toEqual({ reason: undefined });
      req.flush(mockMessage);
    });
  });

  describe('deleteMessage', () => {
    it('should perform a DELETE against /events/{eventId}/messages/{messageId}', () => {
      service.deleteMessage('event-1', 'msg-1').subscribe((res) => {
        expect(res).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/events/event-1/messages/msg-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('sendReaction', () => {
    it('should perform a POST against /events/{slug}/reactions with the dto', () => {
      const dto: SendReactionInput = { type: 'like' };

      service.sendReaction('test-event', dto).subscribe((res) => {
        expect(res).toEqual({ sent: true });
      });

      const req = httpMock.expectOne(`${baseUrl}/events/test-event/reactions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ sent: true });
    });
  });

  describe('validateAccessCode', () => {
    it('should perform a POST against /events/{slug}/access with the dto', () => {
      const dto: AccessCodeInput = {
        code: 'SECRET',
        name: 'Jane',
        email: 'jane@example.com',
        consent: true,
      };
      const response = { valid: true, eventId: 'event-1' };

      service.validateAccessCode('test-event', dto).subscribe((res) => {
        expect(res).toEqual(response);
      });

      const req = httpMock.expectOne(`${baseUrl}/events/test-event/access`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(response);
    });

    it('should handle an invalid access code response', () => {
      const dto: AccessCodeInput = { code: 'WRONG' };

      service.validateAccessCode('test-event', dto).subscribe((res) => {
        expect(res).toEqual({ valid: false, eventId: '' });
      });

      const req = httpMock.expectOne(`${baseUrl}/events/test-event/access`);
      req.flush({ valid: false, eventId: '' });
    });
  });

  describe('service creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });
});
