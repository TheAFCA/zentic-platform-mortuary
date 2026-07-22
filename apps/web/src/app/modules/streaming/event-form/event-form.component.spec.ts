import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventFormComponent } from './event-form.component';
import { StreamingApiService } from '../../../core/services/streaming-api.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatNativeDateModule } from '@angular/material/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { VenuesApiService } from '../../../core/services/venues-api.service';
import { ClientsApiService } from '../../../core/services/clients-api.service';
import { UsersService } from '../../../core/services/users.service';
import { ClientStatus, EventStatus, Venue, Client } from '@zentic/shared-types';

const mockStreamingEvent = {
  id: 'evt-1',
  title: 'Test Event',
  slug: 'test-event',
  description: 'Test description',
  ceremonyType: 'VELATORIO',
  status: EventStatus.SCHEDULED,
  scheduledAt: '2026-07-15T14:30:00',
  startedAt: null,
  finishedAt: null,
  estimatedDuration: 150,
  isPublic: false,
  hasAccessCode: true,
  accessCode: 'CODE123',
  streamKey: null,
  rtmpUrl: null,
  recordingUrl: null,
  viewerCount: 0,
  moderationMode: 'MANUAL',
  createdAt: '2026-07-10T00:00:00',
  deceased: {
    id: 'dec-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    birthDate: '1950-01-15T00:00:00.000Z',
    deathDate: '2026-07-10T00:00:00.000Z',
    photoUrl: null,
    biography: null,
    epitaph: 'Siempre recordado',
  },
  room: {
    id: 'room-1',
    name: 'Capilla A',
    venue: { id: 'venue-1', name: 'Funeraria Central' },
  },
  client: { id: 'client-1', name: 'Familia Pérez' },
  assignedTo: { id: 'op-1', email: 'operator@test.com' },
};

const mockVenues: Venue[] = [
  {
    id: 'venue-1',
    tenantId: 'tenant-1',
    name: 'Funeraria Central',
    address: 'Calle 123',
    createdAt: '',
    updatedAt: '',
    rooms: [
      { id: 'room-1', venueId: 'venue-1', name: 'Capilla A', capacity: 50, createdAt: '' },
      { id: 'room-2', venueId: 'venue-1', name: 'Capilla B', capacity: 30, createdAt: '' },
    ],
  },
  {
    id: 'venue-2',
    tenantId: 'tenant-1',
    name: 'Funeraria Norte',
    address: 'Av. Norte 456',
    createdAt: '',
    updatedAt: '',
    rooms: [{ id: 'room-3', venueId: 'venue-2', name: 'Sala 1', capacity: null, createdAt: '' }],
  },
];

const mockClients: Client[] = [
  {
    id: 'client-1',
    tenantId: 'tenant-1',
    name: 'Familia Pérez',
    email: 'familia@test.com',
    phone: '555-0100',
    relationship: 'Hijo',
    notes: null,
    status: ClientStatus.ACTIVE,
    serviceDate: null,
    convertedFrom: null,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'client-2',
    tenantId: 'tenant-1',
    name: 'Familia López',
    email: null,
    phone: null,
    relationship: null,
    notes: null,
    status: ClientStatus.ACTIVE,
    serviceDate: null,
    convertedFrom: null,
    createdAt: '',
    updatedAt: '',
  },
];

const mockOperators = [
  { id: 'op-1', email: 'operator@test.com', role: 'OPERATOR', createdAt: '', lockedUntil: null },
  { id: 'op-2', email: 'admin@test.com', role: 'TENANT_ADMIN', createdAt: '', lockedUntil: null },
];

describe('EventFormComponent', () => {
  let mockApi: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockVenuesApi: { list: ReturnType<typeof vi.fn> };
  let mockClientsApi: { list: ReturnType<typeof vi.fn> };
  let mockUsersService: { list: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockSnackBar: { open: ReturnType<typeof vi.fn> };

  function createComponent(id: string | null): {
    fixture: ComponentFixture<EventFormComponent>;
    component: EventFormComponent;
  } {
    TestBed.overrideComponent(EventFormComponent, {
      set: {
        providers: [{ provide: MatSnackBar, useValue: mockSnackBar }],
      },
    });
    const mockRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue(id),
        },
      },
    };

    TestBed.configureTestingModule({
      imports: [EventFormComponent, NoopAnimationsModule, MatNativeDateModule],
      providers: [
        { provide: StreamingApiService, useValue: mockApi },
        { provide: VenuesApiService, useValue: mockVenuesApi },
        { provide: ClientsApiService, useValue: mockClientsApi },
        { provide: UsersService, useValue: mockUsersService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    });

    const fixture = TestBed.createComponent(EventFormComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => {
    mockApi = {
      findOne: vi.fn().mockReturnValue(of(mockStreamingEvent)),
      create: vi.fn().mockReturnValue(of(mockStreamingEvent)),
      update: vi.fn().mockReturnValue(of(mockStreamingEvent)),
    };
    mockVenuesApi = { list: vi.fn().mockReturnValue(of(mockVenues)) };
    mockClientsApi = { list: vi.fn().mockReturnValue(of({ data: mockClients })) };
    mockUsersService = { list: vi.fn().mockReturnValue(of(mockOperators)) };
    mockRouter = { navigate: vi.fn().mockResolvedValue(true) };
    mockSnackBar = { open: vi.fn() };
  });

  it('should create the component', () => {
    const { component } = createComponent(null);
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    const { component } = createComponent(null);
    expect(component.form.value).toEqual({
      title: '',
      ceremonyType: 'VELATORIO',
      estimatedDuration: 120,
      scheduledDate: '',
      scheduledTime: '',
      description: '',
      deceasedFirstName: '',
      deceasedLastName: '',
      deceasedBirthDate: '',
      deceasedDeathDate: '',
      deceasedEpitaph: '',
      venueId: null,
      roomId: null,
      clientId: null,
      assignedToId: null,
      isPublic: true,
      accessCode: '',
      moderationMode: 'AUTO',
    });
  });

  it('should set isEdit to false when no id in route', () => {
    const { component } = createComponent(null);
    expect(component.isEdit()).toBe(false);
  });

  it('should set isEdit to true when id is present in route', () => {
    const { component } = createComponent('evt-1');
    expect(component.isEdit()).toBe(true);
    expect(mockApi.findOne).toHaveBeenCalledWith('evt-1');
  });

  it('should mark form invalid when title is empty', () => {
    const { component } = createComponent(null);
    component.form.controls.title.setValue('');
    expect(component.form.invalid).toBe(true);
  });

  it('should load venues, clients, and operators on init', () => {
    createComponent(null);
    expect(mockVenuesApi.list).toHaveBeenCalledTimes(1);
    expect(mockClientsApi.list).toHaveBeenCalledWith({ page: 1, limit: 200 });
    expect(mockUsersService.list).toHaveBeenCalledTimes(1);
  });

  it('onVenueChange should update rooms when venue changes', () => {
    const { component } = createComponent(null);
    component.onVenueChange('venue-1');
    expect(component.selectedVenue()).toEqual(mockVenues[0]);
    expect(component.rooms()).toEqual(mockVenues[0].rooms);
  });

  it('onVenueChange should clear rooms when venue is null', () => {
    const { component } = createComponent(null);
    component.onVenueChange('venue-1');
    expect(component.rooms().length).toBeGreaterThan(0);

    component.onVenueChange(null);
    expect(component.selectedVenue()).toBeNull();
    expect(component.rooms()).toEqual([]);
    expect(component.form.value.roomId).toBeNull();
  });

  it('onSubmit should call api.create with correct data in create mode', () => {
    const { component } = createComponent(null);
    component.form.patchValue({
      title: 'Nuevo Evento',
      ceremonyType: 'ENTIERRO',
      estimatedDuration: 180,
      // MatDatepicker entrega un Date, no el string que espera el API.
      scheduledDate: new Date(2026, 6, 20) as unknown as string,
      scheduledTime: '10:00',
      description: 'Ceremonia de prueba',
      deceasedFirstName: 'María',
      deceasedLastName: 'García',
      deceasedBirthDate: '1960-05-10',
      deceasedDeathDate: '2026-07-18',
      deceasedEpitaph: 'Descanse en paz',
      venueId: 'venue-1',
      roomId: 'room-2',
      clientId: 'client-2',
      assignedToId: 'op-2',
      isPublic: true,
      accessCode: '',
      moderationMode: 'AUTO',
    });

    component.onSubmit();

    expect(mockApi.create).toHaveBeenCalledTimes(1);
    const dto = mockApi.create.mock.calls[0][0];
    expect(dto).toMatchObject({
      title: 'Nuevo Evento',
      ceremonyType: 'ENTIERRO',
      estimatedDuration: 180,
      scheduledAt: new Date(2026, 6, 20, 10, 0, 0).toISOString(),
      description: 'Ceremonia de prueba',
      isPublic: true,
      accessCode: undefined,
      moderationMode: 'AUTO',
      roomId: 'room-2',
      clientId: 'client-2',
      assignedToId: 'op-2',
      deceased: {
        firstName: 'María',
        lastName: 'García',
        birthDate: '1960-05-10',
        deathDate: '2026-07-18',
        epitaph: 'Descanse en paz',
      },
    });
  });

  it('onSubmit should call api.update with correct data in edit mode', () => {
    const { component } = createComponent('evt-1');
    component.form.patchValue({
      title: 'Evento Actualizado',
      ceremonyType: 'MISA',
      scheduledDate: '2026-08-01',
      scheduledTime: '09:00',
    });

    component.onSubmit();

    expect(mockApi.update).toHaveBeenCalledTimes(1);
    expect(mockApi.update).toHaveBeenCalledWith(
      'evt-1',
      expect.objectContaining({
        title: 'Evento Actualizado',
        ceremonyType: 'MISA',
        scheduledAt: new Date(2026, 7, 1, 9, 0, 0).toISOString(),
      }),
    );
  });

  it('onSubmit should not submit when form is invalid', () => {
    const { component } = createComponent(null);
    component.form.controls.title.setValue('');
    component.onSubmit();
    expect(mockApi.create).not.toHaveBeenCalled();
    expect(mockApi.update).not.toHaveBeenCalled();
  });

  it('onSubmit should navigate to /admin/streaming on success', () => {
    const { component } = createComponent(null);
    component.form.patchValue({
      title: 'Test',
      scheduledDate: '2026-08-01',
      scheduledTime: '09:00',
    });

    component.onSubmit();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/streaming']);
  });

  it('onSubmit should show error snackbar on failure', () => {
    mockApi = {
      findOne: vi.fn(),
      create: vi.fn().mockReturnValue(throwError(() => new Error('Error de red'))),
      update: vi.fn(),
    };
    const { component } = createComponent(null);
    component.form.patchValue({
      title: 'Test',
      scheduledDate: '2026-08-01',
      scheduledTime: '09:00',
    });

    component.onSubmit();

    expect(mockApi.create).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Error de red',
      'Cerrar',
      expect.objectContaining({
        politeness: 'assertive',
        panelClass: ['zentic-notification', 'zentic-notification--error'],
      }),
    );
  });
});
