import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  StreamingApiService,
  CreateEventInput,
} from '../../../core/services/streaming-api.service';
import { VenuesApiService } from '../../../core/services/venues-api.service';
import { ClientsApiService } from '../../../core/services/clients-api.service';
import { UsersService, AdminUser } from '../../../core/services/users.service';
import { Client, Venue } from '@zentic/shared-types';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="p-6 max-w-3xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <a mat-icon-button routerLink="/admin/streaming">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ isEdit() ? 'Editar Evento' : 'Nuevo Evento de Streaming' }}
        </h1>
      </div>

      <mat-card>
        <mat-card-content class="p-6">
          @if (loading()) {
            <div class="flex justify-center py-8">
              <mat-spinner diameter="40" />
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
              <h3 class="font-semibold text-gray-700 flex items-center gap-2">
                <mat-icon class="text-lg">info</mat-icon> Información del servicio
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field class="col-span-full">
                  <mat-label>Nombre del evento</mat-label>
                  <input matInput formControlName="title" placeholder="Ej: Velatorio de María López" required />
                  @if (form.get('title')?.invalid && form.get('title')?.touched) {
                    <mat-error>El nombre es requerido</mat-error>
                  }
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Tipo de ceremonia</mat-label>
                  <mat-select formControlName="ceremonyType" required>
                    <mat-option value="VELATORIO">Velatorio</mat-option>
                    <mat-option value="ENTIERRO">Entierro</mat-option>
                    <mat-option value="CREMACION">Cremación</mat-option>
                    <mat-option value="MISA">Misa</mat-option>
                    <mat-option value="OTRO">Otro</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Duración estimada (minutos)</mat-label>
                  <input matInput type="number" formControlName="estimatedDuration" placeholder="180" />
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Fecha</mat-label>
                  <input matInput [matDatepicker]="picker" formControlName="scheduledDate" required />
                  <mat-datepicker-toggle matSuffix [for]="picker" />
                  <mat-datepicker #picker />
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Hora</mat-label>
                  <input matInput type="time" formControlName="scheduledTime" required />
                </mat-form-field>
              </div>

              <mat-form-field class="w-full">
                <mat-label>Descripción del servicio</mat-label>
                <textarea matInput formControlName="description" rows="3"></textarea>
              </mat-form-field>

              <mat-divider />
              <h3 class="font-semibold text-gray-700 flex items-center gap-2">
                <mat-icon class="text-lg">person</mat-icon> Datos del difunto
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field>
                  <mat-label>Nombre</mat-label>
                  <input matInput formControlName="deceasedFirstName" placeholder="Nombre" />
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Apellido</mat-label>
                  <input matInput formControlName="deceasedLastName" placeholder="Apellido" />
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Fecha de nacimiento</mat-label>
                  <input matInput [matDatepicker]="birthPicker" formControlName="deceasedBirthDate" />
                  <mat-datepicker-toggle matSuffix [for]="birthPicker" />
                  <mat-datepicker #birthPicker />
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Fecha de fallecimiento</mat-label>
                  <input matInput [matDatepicker]="deathPicker" formControlName="deceasedDeathDate" />
                  <mat-datepicker-toggle matSuffix [for]="deathPicker" />
                  <mat-datepicker #deathPicker />
                </mat-form-field>
                <mat-form-field class="col-span-full">
                  <mat-label>Epitafio o frase</mat-label>
                  <input matInput formControlName="deceasedEpitaph" placeholder="Ej: Siempre vivirás en nuestros corazones" />
                </mat-form-field>
              </div>

              <mat-divider />
              <h3 class="font-semibold text-gray-700 flex items-center gap-2">
                <mat-icon class="text-lg">location_on</mat-icon> Ubicación
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field>
                  <mat-label>Sede</mat-label>
                  <mat-select formControlName="venueId" (selectionChange)="onVenueChange($event.value)">
                    <mat-option [value]="null">Seleccionar sede</mat-option>
                    @for (v of venues(); track v.id) {
                      <mat-option [value]="v.id">{{ v.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Sala / Capilla</mat-label>
                  <mat-select formControlName="roomId" [disabled]="!selectedVenue()">
                    <mat-option [value]="null">Seleccionar sala</mat-option>
                    @for (r of rooms(); track r.id) {
                      <mat-option [value]="r.id">{{ r.name }}{{ r.capacity ? ' ('+r.capacity+' pers.)' : '' }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <mat-divider />
              <h3 class="font-semibold text-gray-700 flex items-center gap-2">
                <mat-icon class="text-lg">people</mat-icon> Cliente y operador
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field>
                  <mat-label>Cliente / Familia</mat-label>
                  <mat-select formControlName="clientId">
                    <mat-option [value]="null">Sin cliente</mat-option>
                    @for (c of clients(); track c.id) {
                      <mat-option [value]="c.id">{{ c.name }}{{ c.phone ? ' — ' + c.phone : '' }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Operador asignado</mat-label>
                  <mat-select formControlName="assignedToId">
                    <mat-option [value]="null">Sin asignar</mat-option>
                    @for (op of operators(); track op.id) {
                      <mat-option [value]="op.id">{{ op.email }} ({{ op.role }})</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <mat-divider />
              <h3 class="font-semibold text-gray-700 flex items-center gap-2">
                <mat-icon class="text-lg">settings</mat-icon> Configuración del evento
              </h3>
              <div class="flex items-center gap-4">
                <mat-slide-toggle formControlName="isPublic">Evento público</mat-slide-toggle>
                @if (!form.get('isPublic')?.value) {
                  <mat-form-field class="flex-1">
                    <mat-label>Código de acceso</mat-label>
                    <input matInput formControlName="accessCode" placeholder="Ej: FAMILIA2026" />
                  </mat-form-field>
                }
              </div>

              <mat-form-field class="w-full">
                <mat-label>Moderación de mensajes</mat-label>
                <mat-select formControlName="moderationMode">
                  <mat-option value="AUTO">Automática (todos se publican al instante)</mat-option>
                  <mat-option value="MANUAL">Manual (requiere aprobación del operador)</mat-option>
                </mat-select>
              </mat-form-field>

              <div class="flex justify-end gap-3 pt-4">
                <a mat-stroked-button routerLink="/admin/streaming">Cancelar</a>
                <button mat-raised-button color="primary" type="submit" [disabled]="submitting() || form.invalid">
                  @if (submitting()) {
                    <mat-spinner diameter="20" />
                  } @else {
                    {{ isEdit() ? 'Guardar cambios' : 'Crear Evento' }}
                  }
                </button>
              </div>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(StreamingApiService);
  private readonly venuesApi = inject(VenuesApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly venues = signal<Venue[]>([]);
  readonly rooms = signal<Venue['rooms']>([]);
  readonly selectedVenue = signal<Venue | null>(null);
  readonly clients = signal<Client[]>([]);
  readonly operators = signal<AdminUser[]>([]);

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
  }

  onVenueChange(venueId: string | null): void {
    const venue = this.venues().find((v) => v.id === venueId) ?? null;
    this.selectedVenue.set(venue);
    this.rooms.set(venue?.rooms ?? []);
    if (!venue) this.form.patchValue({ roomId: null });
  }

  private loadClients(): void {
    this.clientsApi.list({ page: 1, limit: 200 }).subscribe({
      next: (res) => this.clients.set(res.data),
    });
  }

  private loadOperators(): void {
    this.usersService.list().subscribe({
      next: (list) => this.operators.set(list),
    });
  }

  private loadVenues(): void {
    this.venuesApi.list().subscribe({
      next: (list) => this.venues.set(list),
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
          const parentVenue = this.venues().find((v) => v.rooms.some((r) => r.id === ev.room!.id));
          if (parentVenue) {
            this.onVenueChange(parentVenue.id);
            this.form.patchValue({ venueId: parentVenue.id, roomId: ev.room.id });
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Error al cargar evento', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const scheduledDate = this.form.controls.scheduledDate.value;
    const scheduledTime = this.form.controls.scheduledTime.value;
    const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;

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

    if (deceasedFirstName && deceasedLastName) {
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
        this.snackBar.open(editId ? 'Evento actualizado' : 'Evento creado exitosamente', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/admin/streaming']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err.message ?? 'Error al guardar', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
