import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  StreamingApiService,
  CreateEventInput,
} from '../../../core/services/streaming-api.service';
import { VenuesApiService } from '../../../core/services/venues-api.service';
import { ClientsApiService } from '../../../core/services/clients-api.service';
import { ObituariesApiService } from '../../../core/services/obituaries-api.service';
import { UsersService, AdminUser } from '../../../core/services/users.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Client, Venue } from '@zentic/shared-types';

const CEREMONY_LABELS: Record<string, string> = {
  VELATORIO: 'Velatorio',
  ENTIERRO: 'Entierro',
  CREMACION: 'Cremación',
  MISA: 'Misa',
  OTRO: 'Otro',
};

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSlideToggleModule,
  ],
  styles: [
    `
      :host {
        display: block;
      }

      .form-back {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        color: var(--ink-secondary, #6b7280);
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: color 150ms ease;
      }

      .form-back:hover {
        color: var(--ink, #1f2937);
      }

      .form-title {
        font-family: var(--font-display);
        font-size: 1.6rem;
        font-weight: 500;
        letter-spacing: 0;
        color: var(--ink, #1f2937);
        margin: 0 0 0.15rem;
      }

      .form-subtitle {
        margin: 0 0 1.5rem;
        color: var(--ink-secondary, #6b7280);
        font-size: 0.92rem;
      }

      .form-card {
        border-radius: 1.25rem;
        background: var(--surface-alt, #fff);
        border: 1px solid var(--border, #e7e9ee);
        box-shadow: var(--shadow-card, 0 12px 32px rgba(17, 24, 39, 0.06));
        overflow: hidden;
      }

      .form-card__body {
        padding: 1.5rem;
      }

      .form-section {
        display: grid;
        gap: 0.25rem;
      }

      .form-section + .form-section {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border-light, #f1f3f6);
      }

      .form-section__title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.92rem;
        font-weight: 600;
        color: var(--ink, #1f2937);
        margin: 0 0 1rem;
      }

      .form-section__title mat-icon {
        font-size: 1.15rem;
        width: 1.15rem;
        height: 1.15rem;
        color: var(--brand-primary, #0f5e59);
      }

      .form-section__hint {
        margin: -0.5rem 0 0.75rem;
        color: var(--ink-secondary, #6b7280);
        font-size: 0.85rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-row--single {
        grid-template-columns: 1fr;
      }

      .form-row--triple {
        grid-template-columns: 1fr 1fr 1fr;
      }

      .form-field {
        width: 100%;
      }

      .form-field--full {
        grid-column: 1 / -1;
      }

      .form-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #f1f3f6;
      }

      .form-loading {
        display: flex;
        justify-content: center;
        padding: 3rem 0;
      }

      .config-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
    `,
  ],
  template: `
    <div style="max-width:48rem;margin:0 auto;">
      <a routerLink="/admin/streaming" class="form-back">
        <mat-icon style="font-size:1.1rem;width:1.1rem;height:1.1rem;">arrow_back</mat-icon>
        Volver a eventos
      </a>

      <h1 class="form-title">{{ isEdit() ? 'Editar Evento' : 'Nuevo Evento de Streaming' }}</h1>
      <p class="form-subtitle">
        {{
          isEdit()
            ? 'Actualiza los datos del evento programado.'
            : 'Configura una nueva transmisión en vivo para una ceremonia.'
        }}
      </p>

      <div class="form-card">
        <div class="form-card__body">
          @if (loading()) {
            <div class="form-loading">
              <mat-spinner diameter="32" />
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <div class="form-section">
                <h3 class="form-section__title">
                  <mat-icon>info</mat-icon>
                  Información del servicio
                </h3>
                <div class="form-row">
                  <mat-form-field class="form-field form-field--full">
                    <mat-label>Nombre del evento</mat-label>
                    <input
                      matInput
                      formControlName="title"
                      placeholder="Ej: Velatorio de María López"
                      required
                    />
                    @if (form.get('title')?.invalid && form.get('title')?.touched) {
                      <mat-error>El nombre es requerido</mat-error>
                    }
                  </mat-form-field>
                </div>
                <div class="form-row">
                  <mat-form-field class="form-field">
                    <mat-label>Tipo de ceremonia</mat-label>
                    <mat-select formControlName="ceremonyType" required>
                      <mat-option value="VELATORIO">Velatorio</mat-option>
                      <mat-option value="ENTIERRO">Entierro</mat-option>
                      <mat-option value="CREMACION">Cremación</mat-option>
                      <mat-option value="MISA">Misa</mat-option>
                      <mat-option value="OTRO">Otro</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field class="form-field">
                    <mat-label>Duración estimada (min)</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="estimatedDuration"
                      placeholder="180"
                    />
                  </mat-form-field>
                </div>
                <div class="form-row">
                  <mat-form-field class="form-field">
                    <mat-label>Fecha</mat-label>
                    <input
                      matInput
                      [matDatepicker]="picker"
                      formControlName="scheduledDate"
                      required
                    />
                    <mat-datepicker-toggle matSuffix [for]="picker" />
                    <mat-datepicker #picker />
                  </mat-form-field>
                  <mat-form-field class="form-field">
                    <mat-label>Hora</mat-label>
                    <input matInput type="time" formControlName="scheduledTime" required />
                  </mat-form-field>
                </div>
                <div class="form-row form-row--single">
                  <mat-form-field class="form-field">
                    <mat-label>Descripción del servicio (opcional)</mat-label>
                    <textarea matInput formControlName="description" rows="2"></textarea>
                  </mat-form-field>
                </div>
              </div>

              <div class="form-section">
                <h3 class="form-section__title">
                  <mat-icon>person</mat-icon>
                  Datos del difunto
                </h3>

                @if (obituaryDeceased(); as deceased) {
                  <p class="form-section__hint">
                    Estos datos vienen del obituario vinculado y no se editan aquí.
                  </p>
                  <div class="form-row">
                    <div class="form-field">
                      <strong>{{ deceased.firstName }} {{ deceased.lastName }}</strong>
                    </div>
                    <div class="form-field" *ngIf="deceased.birthDate || deceased.deathDate">
                      {{ deceased.birthDate ? (deceased.birthDate | date: 'longDate') : '—' }} —
                      {{ deceased.deathDate ? (deceased.deathDate | date: 'longDate') : '—' }}
                    </div>
                  </div>
                } @else {
                  <div class="form-row">
                    <mat-form-field class="form-field">
                      <mat-label>Nombre</mat-label>
                      <input matInput formControlName="deceasedFirstName" placeholder="Nombre" />
                    </mat-form-field>
                    <mat-form-field class="form-field">
                      <mat-label>Apellido</mat-label>
                      <input matInput formControlName="deceasedLastName" placeholder="Apellido" />
                    </mat-form-field>
                  </div>
                  <div class="form-row">
                    <mat-form-field class="form-field">
                      <mat-label>Fecha de nacimiento</mat-label>
                      <input
                        matInput
                        [matDatepicker]="birthPicker"
                        formControlName="deceasedBirthDate"
                      />
                      <mat-datepicker-toggle matSuffix [for]="birthPicker" />
                      <mat-datepicker #birthPicker />
                    </mat-form-field>
                    <mat-form-field class="form-field">
                      <mat-label>Fecha de fallecimiento</mat-label>
                      <input
                        matInput
                        [matDatepicker]="deathPicker"
                        formControlName="deceasedDeathDate"
                      />
                      <mat-datepicker-toggle matSuffix [for]="deathPicker" />
                      <mat-datepicker #deathPicker />
                    </mat-form-field>
                  </div>
                  <div class="form-row form-row--single">
                    <mat-form-field class="form-field">
                      <mat-label>Epitafio o frase (opcional)</mat-label>
                      <input
                        matInput
                        formControlName="deceasedEpitaph"
                        placeholder="Ej: Siempre vivirás en nuestros corazones"
                      />
                    </mat-form-field>
                  </div>
                }
              </div>

              <div class="form-section">
                <h3 class="form-section__title">
                  <mat-icon>location_on</mat-icon>
                  Ubicación
                </h3>
                <div class="form-row">
                  <mat-form-field class="form-field">
                    <mat-label>Sede</mat-label>
                    <mat-select
                      formControlName="venueId"
                      (selectionChange)="onVenueChange($event.value)"
                    >
                      <mat-option [value]="null">Seleccionar sede</mat-option>
                      @for (v of venues(); track v.id) {
                        <mat-option [value]="v.id">{{ v.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field class="form-field">
                    <mat-label>Sala / Capilla</mat-label>
                    <mat-select formControlName="roomId" [disabled]="!selectedVenue()">
                      <mat-option [value]="null">Seleccionar sala</mat-option>
                      @for (r of rooms(); track r.id) {
                        <mat-option [value]="r.id"
                          >{{ r.name
                          }}{{ r.capacity ? ' (' + r.capacity + ' pers.)' : '' }}</mat-option
                        >
                      }
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <div class="form-section">
                <h3 class="form-section__title">
                  <mat-icon>people</mat-icon>
                  Cliente y operador
                </h3>
                <div class="form-row">
                  <mat-form-field class="form-field">
                    <mat-label>Cliente / Familia</mat-label>
                    <mat-select formControlName="clientId">
                      <mat-option [value]="null">Sin cliente</mat-option>
                      @for (c of clients(); track c.id) {
                        <mat-option [value]="c.id"
                          >{{ c.name }}{{ c.phone ? ' — ' + c.phone : '' }}</mat-option
                        >
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field class="form-field">
                    <mat-label>Operador asignado</mat-label>
                    <mat-select formControlName="assignedToId">
                      <mat-option [value]="null">Sin asignar</mat-option>
                      @for (op of operators(); track op.id) {
                        <mat-option [value]="op.id">{{ op.email }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <div class="form-section">
                <h3 class="form-section__title">
                  <mat-icon>settings</mat-icon>
                  Configuración del evento
                </h3>
                <div class="config-row">
                  <mat-slide-toggle formControlName="isPublic">Evento público</mat-slide-toggle>
                  @if (!form.get('isPublic')?.value) {
                    <mat-form-field class="form-field" style="flex:1;min-width:14rem;">
                      <mat-label>Código de acceso</mat-label>
                      <input matInput formControlName="accessCode" placeholder="Ej: FAMILIA2026" />
                    </mat-form-field>
                  }
                </div>
                <div class="form-row form-row--single" style="margin-top:1rem;">
                  <mat-form-field class="form-field">
                    <mat-label>Moderación de mensajes</mat-label>
                    <mat-select formControlName="moderationMode">
                      <mat-option value="AUTO"
                        >Automática — todos se publican al instante</mat-option
                      >
                      <mat-option value="MANUAL"
                        >Manual — requiere aprobación del operador</mat-option
                      >
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <div class="form-footer">
                <a mat-stroked-button routerLink="/admin/streaming">Cancelar</a>
                <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  [disabled]="submitting() || form.invalid"
                >
                  @if (submitting()) {
                    <mat-spinner diameter="18" />
                  }
                  {{ isEdit() ? 'Guardar cambios' : 'Crear Evento' }}
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(StreamingApiService);
  private readonly venuesApi = inject(VenuesApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly obituariesApi = inject(ObituariesApiService);
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly venues = signal<Venue[]>([]);
  readonly rooms = signal<Venue['rooms']>([]);
  readonly selectedVenue = signal<Venue | null>(null);
  readonly clients = signal<Client[]>([]);
  readonly operators = signal<AdminUser[]>([]);
  // Cuando el evento se crea "desde" un obituario, el difunto viene de ahí — se
  // muestra en modo solo lectura en vez de dejarlo editar en "Datos del difunto".
  readonly obituaryDeceased = signal<{
    firstName: string;
    lastName: string;
    birthDate: string | null;
    deathDate: string | null;
  } | null>(null);
  private fromObituaryId: string | null = null;
  private fromObituaryDeceasedId: string | null = null;
  // loadVenues()/loadEvent()/loadFromObituary() se disparan en paralelo en el constructor
  // — si la sala a preseleccionar llega antes que las sedes (o viceversa), ninguna de las
  // dos por sí sola tiene todo lo necesario. Se guarda el pendiente y ambos caminos
  // reintentan aplicarlo; solo se limpia cuando realmente se encontró y aplicó.
  private pendingRoomId: string | null = null;

  readonly isEdit = () => !!this.route.snapshot.paramMap.get('id');

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    ceremonyType: ['VELATORIO', Validators.required],
    estimatedDuration: [120],
    scheduledDate: ['', Validators.required],
    scheduledTime: ['', Validators.required],
    description: [''],
    deceasedFirstName: [''],
    deceasedLastName: [''],
    deceasedBirthDate: [''],
    deceasedDeathDate: [''],
    deceasedEpitaph: [''],
    venueId: [null as string | null],
    roomId: [null as string | null],
    clientId: [null as string | null],
    assignedToId: [null as string | null],
    isPublic: [true],
    accessCode: [''],
    moderationMode: ['AUTO'],
  });

  constructor() {
    const editId = this.route.snapshot.paramMap.get('id');
    if (editId) this.loadEvent(editId);
    this.loadVenues();
    this.loadClients();
    this.loadOperators();

    const fromObituary = this.route.snapshot.queryParamMap.get('fromObituary');
    if (fromObituary && !editId) this.loadFromObituary(fromObituary);
  }

  onVenueChange(venueId: string | null): void {
    const venue = this.venues().find((v) => v.id === venueId) ?? null;
    this.selectedVenue.set(venue);
    this.rooms.set(venue?.rooms ?? []);
    if (!venue) this.form.patchValue({ roomId: null });
  }

  private loadClients(): void {
    this.clientsApi.list({ page: 1, limit: 100 }).subscribe({
      next: (res) => this.clients.set(res.data),
      error: (error: unknown) =>
        this.notifications.apiError(error, 'No se pudieron cargar los clientes'),
    });
  }

  private loadOperators(): void {
    this.usersService.list().subscribe({
      next: (list) => this.operators.set(list),
      error: (error: unknown) =>
        this.notifications.apiError(error, 'No se pudieron cargar los operadores'),
    });
  }

  private loadVenues(): void {
    this.venuesApi.list().subscribe({
      next: (list) => {
        this.venues.set(list);
        this.applyPendingRoomSelection();
      },
      error: (error: unknown) =>
        this.notifications.apiError(error, 'No se pudieron cargar las sedes'),
    });
  }

  private applyPendingRoomSelection(): void {
    if (!this.pendingRoomId) return;
    const parentVenue = this.venues().find((v) => v.rooms.some((r) => r.id === this.pendingRoomId));
    if (!parentVenue) return;
    this.onVenueChange(parentVenue.id);
    this.form.patchValue({ venueId: parentVenue.id, roomId: this.pendingRoomId });
    this.pendingRoomId = null;
  }

  private loadFromObituary(obituaryId: string): void {
    this.obituariesApi.get(obituaryId).subscribe({
      next: (obituary) => {
        this.fromObituaryId = obituaryId;
        this.fromObituaryDeceasedId = obituary.deceasedId;
        this.obituaryDeceased.set({
          firstName: obituary.deceased.firstName,
          lastName: obituary.deceased.lastName,
          birthDate: obituary.deceased.birthDate,
          deathDate: obituary.deceased.deathDate,
        });

        const ceremonyType = obituary.serviceType ?? 'VELATORIO';
        const ceremonyLabel = CEREMONY_LABELS[ceremonyType] ?? ceremonyType;
        const patch: Record<string, unknown> = {
          title: `${ceremonyLabel} de ${obituary.deceased.firstName} ${obituary.deceased.lastName}`,
          ceremonyType,
        };
        if (obituary.serviceAt) {
          const date = new Date(obituary.serviceAt);
          patch['scheduledDate'] = date.toISOString().split('T')[0];
          patch['scheduledTime'] =
            `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        this.form.patchValue(patch);

        if (obituary.roomId) {
          this.pendingRoomId = obituary.roomId;
          this.applyPendingRoomSelection();
        }
      },
      error: (error: unknown) =>
        this.notifications.apiError(error, 'No se pudo cargar el obituario'),
    });
  }

  private loadEvent(id: string): void {
    this.loading.set(true);
    this.api.findOne(id).subscribe({
      next: (ev) => {
        const date = ev.scheduledAt ? new Date(ev.scheduledAt) : new Date();
        this.form.patchValue({
          title: ev.title,
          ceremonyType: ev.ceremonyType,
          estimatedDuration: ev.estimatedDuration ?? 120,
          scheduledDate: date.toISOString().split('T')[0],
          scheduledTime: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
          description: ev.description ?? '',
          deceasedFirstName: ev.deceased?.firstName ?? '',
          deceasedLastName: ev.deceased?.lastName ?? '',
          deceasedBirthDate: ev.deceased?.birthDate?.split('T')[0] ?? '',
          deceasedDeathDate: ev.deceased?.deathDate?.split('T')[0] ?? '',
          deceasedEpitaph: ev.deceased?.epitaph ?? '',
          roomId: ev.room?.id ?? null,
          clientId: ev.client?.id ?? null,
          assignedToId: ev.assignedTo?.id ?? null,
          isPublic: ev.isPublic,
          moderationMode: ev.moderationMode,
        });
        if (ev.room) {
          this.pendingRoomId = ev.room.id;
          this.applyPendingRoomSelection();
        }
        this.loading.set(false);
      },
      error: () => {
        this.notifications.error('No se pudo cargar el evento. Inténtalo de nuevo.');
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const scheduledDate = this.toLocalDateString(this.form.controls.scheduledDate.value);
    const scheduledTime = this.form.controls.scheduledTime.value;
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

    const deceasedFirstName = this.form.controls.deceasedFirstName.value;
    const deceasedLastName = this.form.controls.deceasedLastName.value;

    const dto: CreateEventInput = {
      title: this.form.controls.title.value,
      ceremonyType: this.form.controls.ceremonyType.value,
      estimatedDuration: this.form.controls.estimatedDuration.value || undefined,
      description: this.form.controls.description.value || undefined,
      scheduledAt,
      isPublic: this.form.controls.isPublic.value,
      accessCode: this.form.controls.accessCode.value || undefined,
      moderationMode: this.form.controls.moderationMode.value,
      roomId: this.form.controls.roomId.value || undefined,
      clientId: this.form.controls.clientId.value || undefined,
      assignedToId: this.form.controls.assignedToId.value || undefined,
    };

    if (this.fromObituaryId) {
      dto.obituaryId = this.fromObituaryId;
      dto.deceasedId = this.fromObituaryDeceasedId ?? undefined;
    } else if (deceasedFirstName && deceasedLastName) {
      dto.deceased = {
        firstName: deceasedFirstName,
        lastName: deceasedLastName,
        birthDate: this.form.controls.deceasedBirthDate.value || undefined,
        deathDate: this.form.controls.deceasedDeathDate.value || undefined,
        epitaph: this.form.controls.deceasedEpitaph.value || undefined,
      };
    }

    const editId = this.route.snapshot.paramMap.get('id');
    const request = editId ? this.api.update(editId, dto) : this.api.create(dto);

    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.notifications.success(editId ? 'Evento actualizado' : 'Evento creado correctamente');
        void this.router.navigate(['/admin/streaming']);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.notifications.apiError(error, 'No se pudo guardar el evento');
      },
    });
  }

  private toLocalDateString(value: string | Date): string {
    if (typeof value === 'string') return value;

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
