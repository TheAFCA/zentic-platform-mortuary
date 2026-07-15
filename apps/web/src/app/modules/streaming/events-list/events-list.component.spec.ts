import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EventsListComponent } from './events-list.component';
import { StreamingApiService, StreamingEvent } from '../../../core/services/streaming-api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Observable } from 'rxjs';

const mockEvents: StreamingEvent[] = [
  {
    id: 'evt-1',
    title: 'Test Event',
    slug: 'test-event',
    status: 'SCHEDULED' as any,
    scheduledAt: '2026-07-15T10:00:00Z',
    ceremonyType: 'VELATORIO',
    description: null,
    startedAt: null,
    finishedAt: null,
    estimatedDuration: 120,
    isPublic: true,
    streamKey: null,
    rtmpUrl: null,
    recordingUrl: null,
    viewerCount: 0,
    moderationMode: 'AUTO',
    createdAt: '2026-07-10T10:00:00Z',
    deceased: {
      id: 'dec-1',
      firstName: 'María',
      lastName: 'López',
      birthDate: null,
      deathDate: null,
      photoUrl: null,
      biography: null,
      epitaph: null,
    },
    room: null,
    client: null,
    assignedTo: null,
  },
  {
    id: 'evt-2',
    title: 'Live Event',
    slug: 'live-event',
    status: 'LIVE' as any,
    scheduledAt: '2026-07-15T14:00:00Z',
    ceremonyType: 'MISA',
    description: null,
    startedAt: '2026-07-15T14:00:00Z',
    finishedAt: null,
    estimatedDuration: 90,
    isPublic: true,
    streamKey: 'key-2',
    rtmpUrl: 'rtmp://example.com/live',
    recordingUrl: null,
    viewerCount: 15,
    moderationMode: 'AUTO',
    createdAt: '2026-07-10T10:00:00Z',
    deceased: {
      id: 'dec-2',
      firstName: 'Juan',
      lastName: 'Pérez',
      birthDate: null,
      deathDate: null,
      photoUrl: null,
      biography: null,
      epitaph: null,
    },
    room: null,
    client: null,
    assignedTo: null,
  },
  {
    id: 'evt-3',
    title: 'Finished Event',
    slug: 'finished-event',
    status: 'FINISHED' as any,
    scheduledAt: '2026-07-14T10:00:00Z',
    ceremonyType: 'VELATORIO',
    description: null,
    startedAt: '2026-07-14T10:00:00Z',
    finishedAt: '2026-07-14T12:00:00Z',
    estimatedDuration: 120,
    isPublic: true,
    streamKey: null,
    rtmpUrl: null,
    recordingUrl: 'https://example.com/recording.mp4',
    viewerCount: 42,
    moderationMode: 'AUTO',
    createdAt: '2026-07-10T10:00:00Z',
    deceased: {
      id: 'dec-3',
      firstName: 'Carlos',
      lastName: 'Ramírez',
      birthDate: null,
      deathDate: null,
      photoUrl: null,
      biography: null,
      epitaph: null,
    },
    room: null,
    client: null,
    assignedTo: null,
  },
];

function configureTestingModule(apiMock: Partial<StreamingApiService>) {
  TestBed.configureTestingModule({
    imports: [EventsListComponent],
    providers: [
      provideRouter([]),
      { provide: StreamingApiService, useValue: apiMock },
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
    ],
  });
}

describe('EventsListComponent', () => {
  it('should create the component', () => {
    configureTestingModule({ findAll: () => of(mockEvents) });
    const fixture = TestBed.createComponent(EventsListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load events on init', () => {
    const findAll = vi.fn().mockReturnValue(of(mockEvents));
    configureTestingModule({ findAll });
    const fixture = TestBed.createComponent(EventsListComponent);
    const component = fixture.componentInstance;

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(component.events()).toEqual(mockEvents);
    expect(component.loading()).toBe(false);
  });

  it('should show loading state initially', () => {
    const findAll = vi.fn().mockReturnValue(new Observable<never>(() => {}));
    configureTestingModule({ findAll });
    const fixture = TestBed.createComponent(EventsListComponent);
    const component = fixture.componentInstance;

    expect(component.loading()).toBe(true);
    expect(component.events()).toEqual([]);
  });

  it('should show error state when API fails', () => {
    const findAll = vi.fn().mockReturnValue(throwError(() => ({ message: 'Network error' })));
    configureTestingModule({ findAll });
    const fixture = TestBed.createComponent(EventsListComponent);
    const component = fixture.componentInstance;

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(component.error()).toBe('Network error');
    expect(component.loading()).toBe(false);
  });

  it('should filter events by tab', () => {
    configureTestingModule({ findAll: () => of(mockEvents) });
    const fixture = TestBed.createComponent(EventsListComponent);
    const component = fixture.componentInstance;

    component.activeTab.set('SCHEDULED');
    expect(component.filteredEvents()).toEqual([mockEvents[0]]);

    component.activeTab.set('LIVE');
    expect(component.filteredEvents()).toEqual([mockEvents[1]]);

    component.activeTab.set('FINISHED');
    expect(component.filteredEvents()).toEqual([mockEvents[2]]);

    component.activeTab.set('CANCELLED');
    expect(component.filteredEvents()).toEqual([]);

    component.activeTab.set('all');
    expect(component.filteredEvents()).toEqual(mockEvents);
  });

  it('should return correct status labels', () => {
    configureTestingModule({ findAll: () => of(mockEvents) });
    const fixture = TestBed.createComponent(EventsListComponent);
    const component = fixture.componentInstance;

    expect(component.statusLabel('SCHEDULED')).toBe('Programado');
    expect(component.statusLabel('LIVE')).toBe('En vivo');
    expect(component.statusLabel('PAUSED')).toBe('Pausado');
    expect(component.statusLabel('FINISHED')).toBe('Finalizado');
    expect(component.statusLabel('CANCELLED')).toBe('Cancelado');
    expect(component.statusLabel('INTERRUPTED')).toBe('Interrumpido');
    expect(component.statusLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('should return correct status icons', () => {
    configureTestingModule({ findAll: () => of(mockEvents) });
    const fixture = TestBed.createComponent(EventsListComponent);
    const component = fixture.componentInstance;

    expect(component.statusIcon('SCHEDULED')).toBe('schedule');
    expect(component.statusIcon('LIVE')).toBe('stream');
    expect(component.statusIcon('PAUSED')).toBe('pause_circle');
    expect(component.statusIcon('FINISHED')).toBe('check_circle');
    expect(component.statusIcon('CANCELLED')).toBe('cancel');
    expect(component.statusIcon('INTERRUPTED')).toBe('error_outline');
    expect(component.statusIcon('UNKNOWN')).toBe('help_outline');
  });

  it('should return active tab label', () => {
    configureTestingModule({ findAll: () => of(mockEvents) });
    const fixture = TestBed.createComponent(EventsListComponent);
    const component = fixture.componentInstance;

    expect(component.activeTabLabel()).toBe('Todos');

    component.activeTab.set('SCHEDULED');
    expect(component.activeTabLabel()).toBe('Próximos');

    component.activeTab.set('LIVE');
    expect(component.activeTabLabel()).toBe('En vivo');

    component.activeTab.set('FINISHED');
    expect(component.activeTabLabel()).toBe('Finalizados');

    component.activeTab.set('CANCELLED');
    expect(component.activeTabLabel()).toBe('Cancelados');

    component.activeTab.set('NONEXISTENT');
    expect(component.activeTabLabel()).toBe('');
  });

  it('should update counts after loading events', () => {
    const findAll = vi.fn().mockReturnValue(of(mockEvents));
    configureTestingModule({ findAll });
    const fixture = TestBed.createComponent(EventsListComponent);
    const component = fixture.componentInstance;

    expect(component.tabs[0].count).toBe(3); // all
    expect(component.tabs[1].count).toBe(1); // SCHEDULED
    expect(component.tabs[2].count).toBe(1); // LIVE
    expect(component.tabs[3].count).toBe(1); // FINISHED
    expect(component.tabs[4].count).toBe(0); // CANCELLED
  });
});
