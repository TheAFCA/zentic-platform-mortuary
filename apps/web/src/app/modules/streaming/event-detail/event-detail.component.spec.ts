import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventDetailComponent } from './event-detail.component';
import { StreamingApiService } from '../../../core/services/streaming-api.service';
import { StreamingSocketService } from '../../../core/services/streaming-socket.service';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';
import { EventStatus } from '@zentic/shared-types';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { InvitationsApiService } from '../../../core/services/invitations-api.service';

const successNotification = expect.objectContaining({
  duration: 4000,
  politeness: 'polite',
  panelClass: ['zentic-notification', 'zentic-notification--success'],
});

const errorNotification = expect.objectContaining({
  politeness: 'assertive',
  panelClass: ['zentic-notification', 'zentic-notification--error'],
});

const mockDeceased = {
  id: 'dec-1',
  firstName: 'María',
  lastName: 'López',
  birthDate: null as string | null,
  deathDate: null as string | null,
  photoUrl: null as string | null,
  biography: null as string | null,
  epitaph: null as string | null,
};

const mockEvent = {
  id: 'evt-1',
  title: 'Test Event',
  slug: 'test-event',
  status: 'SCHEDULED' as EventStatus,
  scheduledAt: '2026-07-15T10:00:00Z',
  ceremonyType: 'VELATORIO',
  streamKey: 'zentic_abc123',
  rtmpUrl: 'rtmps://test.com/live',
  recordingUrl: null,
  description: null,
  startedAt: null,
  finishedAt: null,
  estimatedDuration: 120,
  isPublic: true,
  hasAccessCode: false,
  viewerCount: 0,
  moderationMode: 'AUTO',
  createdAt: '2026-07-10T10:00:00Z',
  deceased: mockDeceased,
  room: null,
  client: null,
  assignedTo: null,
};

const mockMessages = [
  {
    id: 'msg-1',
    authorName: 'Ana',
    content: 'Hola',
    iconType: 'heart',
    status: 'APPROVED',
    createdAt: '2026-07-15T10:01:00Z',
  },
  {
    id: 'msg-2',
    authorName: 'Luis',
    content: 'Adiós',
    iconType: null,
    status: 'PENDING',
    createdAt: '2026-07-15T10:02:00Z',
  },
];

interface SetupReturn {
  fixture: ComponentFixture<EventDetailComponent>;
  component: EventDetailComponent;
  api: {
    findOne: ReturnType<typeof vi.fn>;
    getCredentials: ReturnType<typeof vi.fn>;
    revealCredentials: ReturnType<typeof vi.fn>;
    rotateStreamKey: ReturnType<typeof vi.fn>;
    auditStreamKeyCopy: ReturnType<typeof vi.fn>;
    startStream: ReturnType<typeof vi.fn>;
    stopStream: ReturnType<typeof vi.fn>;
    getMessages: ReturnType<typeof vi.fn>;
    getPendingMessages: ReturnType<typeof vi.fn>;
    approveMessage: ReturnType<typeof vi.fn>;
    rejectMessage: ReturnType<typeof vi.fn>;
  };
  socket: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    newMessage$: Subject<any>;
    viewerCount$: Subject<number>;
    streamStatus$: Subject<string>;
    newReaction$: Subject<any>;
    messagePending$: Subject<any>;
  };
  snackBar: { open: ReturnType<typeof vi.fn> };
  sanitizer: { bypassSecurityTrustResourceUrl: ReturnType<typeof vi.fn> };
  newMessage$: Subject<any>;
  viewerCount$: Subject<number>;
  streamStatus$: Subject<string>;
}

function setup(overrides?: {
  apiOverrides?: Partial<{
    findOne: ReturnType<typeof vi.fn>;
    getCredentials: ReturnType<typeof vi.fn>;
    revealCredentials: ReturnType<typeof vi.fn>;
    rotateStreamKey: ReturnType<typeof vi.fn>;
    auditStreamKeyCopy: ReturnType<typeof vi.fn>;
    startStream: ReturnType<typeof vi.fn>;
    stopStream: ReturnType<typeof vi.fn>;
    getMessages: ReturnType<typeof vi.fn>;
    getPendingMessages: ReturnType<typeof vi.fn>;
    approveMessage: ReturnType<typeof vi.fn>;
    rejectMessage: ReturnType<typeof vi.fn>;
  }>;
}): SetupReturn {
  const newMessage$ = new Subject<any>();
  const viewerCount$ = new Subject<number>();
  const streamStatus$ = new Subject<string>();
  const newReaction$ = new Subject<any>();
  const messagePending$ = new Subject<any>();

  const mockSocket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    newMessage$,
    viewerCount$,
    streamStatus$,
    newReaction$,
    messagePending$,
  };

  const apiDefaults: SetupReturn['api'] = {
    findOne: vi.fn().mockReturnValue(of(mockEvent)),
    getCredentials: vi.fn().mockReturnValue(
      of({
        streamKey: 'zent••••c123',
        rtmpUrl: 'rtmps://test.com/live',
        revealed: false,
      }),
    ),
    revealCredentials: vi.fn().mockReturnValue(
      of({
        streamKey: 'zentic_abc123',
        rtmpUrl: 'rtmps://test.com/live',
        revealed: true,
      }),
    ),
    rotateStreamKey: vi.fn().mockReturnValue(
      of({
        streamKey: 'zentic_rotated',
        rtmpUrl: 'rtmps://test.com/live',
        revealed: true,
      }),
    ),
    auditStreamKeyCopy: vi.fn().mockReturnValue(of({ recorded: true })),
    startStream: vi.fn().mockReturnValue(of(mockEvent)),
    stopStream: vi.fn().mockReturnValue(of(mockEvent)),
    getMessages: vi.fn().mockReturnValue(of(mockMessages)),
    getPendingMessages: vi.fn().mockReturnValue(of([])),
    approveMessage: vi.fn().mockReturnValue(of({})),
    rejectMessage: vi.fn().mockReturnValue(of({})),
  };

  const api = { ...apiDefaults, ...overrides?.apiOverrides };

  const snackBar = { open: vi.fn() };
  const sanitizer = { bypassSecurityTrustResourceUrl: vi.fn().mockReturnValue('safe-url') };
  const route = { snapshot: { paramMap: { get: vi.fn().mockReturnValue('evt-1') } } };

  TestBed.configureTestingModule({
    imports: [EventDetailComponent],
    providers: [
      { provide: ActivatedRoute, useValue: route },
      { provide: StreamingApiService, useValue: api },
      { provide: StreamingSocketService, useValue: mockSocket },
      {
        provide: InvitationsApiService,
        useValue: { create: vi.fn().mockReturnValue(of({ id: 'inv-1' })) },
      },
      {
        provide: AuthStateService,
        useValue: { hasPermission: vi.fn().mockReturnValue(true) },
      },
      { provide: DomSanitizer, useValue: sanitizer },
    ],
  });

  TestBed.overrideProvider(MatSnackBar, { useValue: snackBar });

  const fixture = TestBed.createComponent(EventDetailComponent);
  fixture.detectChanges();

  return {
    fixture,
    component: fixture.componentInstance,
    api,
    socket: mockSocket,
    snackBar,
    sanitizer,
    newMessage$,
    viewerCount$,
    streamStatus$,
  };
}

describe('EventDetailComponent', () => {
  it('should create the component', () => {
    const { component } = setup();
    expect(component).toBeTruthy();
  });

  it('should load event on init', () => {
    const { component, api } = setup();
    expect(api.findOne).toHaveBeenCalledWith('evt-1');
    expect(component.event()?.id).toBe('evt-1');
    expect(component.loading()).toBe(false);
    expect(api.getCredentials).toHaveBeenCalledWith('evt-1');
  });

  it('reloads the event when the player requests a refreshed playback URL', () => {
    const { component, api } = setup();
    api.findOne.mockClear();

    component.refreshPlaybackUrl();

    expect(api.findOne).toHaveBeenCalledWith('evt-1');
  });

  it('should show error state when event load fails', () => {
    const { component, api } = setup({
      apiOverrides: {
        findOne: vi.fn().mockReturnValue(throwError(() => new Error('Not found'))),
      },
    });
    expect(api.findOne).toHaveBeenCalledWith('evt-1');
    expect(component.error()).toBe('Not found');
    expect(component.loading()).toBe(false);
    expect(component.event()).toBeNull();
  });

  describe('copyToClipboard', () => {
    it('should write to clipboard and show snackbar', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
        writable: true,
      });

      const { component, snackBar } = setup();
      component.copyToClipboard('test-value');

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('test-value');
      });
      expect(snackBar.open).toHaveBeenCalledWith(
        'Copiado al portapapeles',
        'Cerrar',
        successNotification,
      );
    });
  });

  describe('startStream', () => {
    it('should call api.startStream and connect socket', () => {
      const { component, api, socket, snackBar } = setup();
      api.startStream.mockReturnValue(of({ ...mockEvent, status: 'LIVE' }));

      component.startStream();

      expect(api.startStream).toHaveBeenCalledWith('evt-1');
      expect(socket.connect).toHaveBeenCalledWith('evt-1', true);
      expect(component.streamLoading()).toBe(false);
      expect(component.event()?.status).toBe('LIVE');
      expect(snackBar.open).toHaveBeenCalledWith(
        'Transmisión iniciada',
        'Cerrar',
        successNotification,
      );
    });

    it('should handle error from API', () => {
      const { component, api, socket, snackBar } = setup();
      api.startStream.mockReturnValue(throwError(() => new Error('Error de red')));

      component.startStream();

      expect(component.streamLoading()).toBe(false);
      expect(socket.connect).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith('Error de red', 'Cerrar', errorNotification);
    });
  });

  describe('recording tab', () => {
    it('renders the player for an INTERRUPTED event with a playbackUrl (the recording may already exist)', () => {
      const { component, fixture } = setup();
      component.event.set({
        ...mockEvent,
        status: 'INTERRUPTED',
        playbackUrl: 'https://example.com/recording.m3u8',
      } as any);
      component.activeTab.set('recording');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-hls-player')).not.toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('No hay grabación disponible');
    });

    it('shows the empty state for a SCHEDULED event with no playbackUrl', () => {
      const { component, fixture } = setup();
      component.event.set({
        ...mockEvent,
        status: 'SCHEDULED',
        playbackUrl: null,
      } as any);
      component.activeTab.set('recording');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-hls-player')).toBeNull();
    });
  });

  describe('stopStream', () => {
    it('should call api.stopStream and disconnect socket', () => {
      const { component, api, socket, snackBar } = setup();
      api.stopStream.mockReturnValue(of({ ...mockEvent, status: 'FINISHED' }));

      component.stopStream();

      expect(api.stopStream).toHaveBeenCalledWith('evt-1');
      expect(socket.disconnect).toHaveBeenCalled();
      expect(component.streamLoading()).toBe(false);
      expect(component.event()?.status).toBe('FINISHED');
      expect(snackBar.open).toHaveBeenCalledWith(
        'Transmisión finalizada',
        'Cerrar',
        successNotification,
      );
    });

    it('should handle error from API', () => {
      const { component, api, socket, snackBar } = setup();
      api.stopStream.mockReturnValue(throwError(() => new Error('Error de red')));

      component.stopStream();

      expect(component.streamLoading()).toBe(false);
      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith('Error de red', 'Cerrar', errorNotification);
    });
  });

  describe('loadMessages', () => {
    it('should call api.getMessages', () => {
      const { component, api } = setup();
      component.messages.set([]);
      component.loadMessages();

      expect(api.getMessages).toHaveBeenCalledWith('evt-1');
      expect(component.messages()).toEqual(mockMessages);
      expect(component.messagesLoading()).toBe(false);
    });
  });

  describe('loadPendingMessages', () => {
    it('should call api.getPendingMessages', () => {
      const { component, api } = setup();
      const pending = [
        {
          id: 'p-1',
          authorName: 'Pendiente',
          content: 'Test',
          iconType: null,
          status: 'PENDING',
          createdAt: '2026-07-15T10:03:00Z',
        },
      ];
      api.getPendingMessages.mockReturnValue(of(pending));
      component.messages.set([]);

      component.loadPendingMessages();

      expect(api.getPendingMessages).toHaveBeenCalledWith('evt-1');
      expect(component.messages()).toEqual(pending);
      expect(component.pendingCount()).toBe(1);
      expect(component.messagesLoading()).toBe(false);
    });
  });

  describe('approveMessage', () => {
    it('should call api.approveMessage and update messages', () => {
      const { component, api, snackBar } = setup();
      api.approveMessage.mockReturnValue(of({}));
      component.messages.set(mockMessages);
      component.pendingCount.set(2);

      component.approveMessage('msg-2');

      expect(api.approveMessage).toHaveBeenCalledWith('evt-1', 'msg-2');
      expect(component.messages().find((m: any) => m.id === 'msg-2')).toBeUndefined();
      expect(component.pendingCount()).toBe(1);
      expect(snackBar.open).toHaveBeenCalledWith('Mensaje aprobado', 'Cerrar', successNotification);
    });
  });

  describe('rejectMessage', () => {
    it('should call api.rejectMessage', () => {
      const { component, api, snackBar } = setup();
      api.rejectMessage.mockReturnValue(of({}));
      component.messages.set(mockMessages);
      component.pendingCount.set(2);

      component.rejectMessage('msg-2');

      expect(api.rejectMessage).toHaveBeenCalledWith('evt-1', 'msg-2');
      expect(component.messages().find((m: any) => m.id === 'msg-2')).toBeUndefined();
      expect(component.pendingCount()).toBe(1);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Mensaje rechazado',
        'Cerrar',
        successNotification,
      );
    });
  });

  describe('statusLabel', () => {
    it('should return correct label for each status', () => {
      const { component } = setup();
      expect(component.statusLabel('SCHEDULED')).toBe('Programado');
      expect(component.statusLabel('LIVE')).toBe('En vivo');
      expect(component.statusLabel('PAUSED')).toBe('Pausado');
      expect(component.statusLabel('FINISHED')).toBe('Finalizado');
      expect(component.statusLabel('CANCELLED')).toBe('Cancelado');
      expect(component.statusLabel('INTERRUPTED')).toBe('Interrumpido');
    });

    it('should return the status itself when label is not found', () => {
      const { component } = setup();
      expect(component.statusLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getPublicUrl', () => {
    it('should return correct URL based on event slug', () => {
      const { component } = setup();
      const url = component.getPublicUrl();
      expect(url).toContain('/e/test-event');
    });

    it('should return empty string when event is null', () => {
      const { component } = setup({
        apiOverrides: {
          findOne: vi.fn().mockReturnValue(throwError(() => new Error('Error'))),
        },
      });
      expect(component.getPublicUrl()).toBe('');
    });
  });

  describe('previewUrl', () => {
    it('should return sanitized URL when event exists', () => {
      const { component, sanitizer } = setup();
      const url = component.previewUrl();
      expect(url).toBe('safe-url');
      expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(
        expect.stringContaining('/e/test-event'),
      );
    });

    it('should return null when event is null', () => {
      const { component } = setup({
        apiOverrides: {
          findOne: vi.fn().mockReturnValue(throwError(() => new Error('Error'))),
        },
      });
      expect(component.previewUrl()).toBeNull();
    });
  });

  describe('messagePending$ subscription', () => {
    it('increments pendingCount when a new pending message arrives', () => {
      const { component, socket } = setup();

      socket.messagePending$.next({
        id: 'msg-3',
        authorName: 'Carlos',
        content: 'Nuevo mensaje',
        iconType: null,
        createdAt: '2026-07-15T10:03:00Z',
      });

      expect(component.pendingCount()).toBe(1);
    });

    it('appends the message to the list when the pending tab is showing', () => {
      const { component, socket } = setup();
      component.showingPending.set(true);

      socket.messagePending$.next({
        id: 'msg-3',
        authorName: 'Carlos',
        content: 'Nuevo mensaje',
        iconType: null,
        createdAt: '2026-07-15T10:03:00Z',
      });

      expect(component.messages().find((m: any) => m.id === 'msg-3')).toBeTruthy();
    });

    it('does not append to the list when the approved tab is showing', () => {
      const { component, socket } = setup();
      component.showingPending.set(false);

      socket.messagePending$.next({
        id: 'msg-3',
        authorName: 'Carlos',
        content: 'Nuevo mensaje',
        iconType: null,
        createdAt: '2026-07-15T10:03:00Z',
      });

      expect(component.messages().find((m: any) => m.id === 'msg-3')).toBeUndefined();
      expect(component.pendingCount()).toBe(1);
    });
  });
});
