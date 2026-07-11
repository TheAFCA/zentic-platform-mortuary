import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import {
  StreamingApiService,
  CreateEventInput,
  StreamingEvent,
} from '../../../core/services/streaming-api.service';

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
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field class="col-span-full">
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
                  <input
                    matInput
                    type="number"
                    formControlName="estimatedDuration"
                    placeholder="180"
                  />
                </mat-form-field>

                <mat-form-field>
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
              <h3 class="font-semibold text-gray-700">Datos del difunto</h3>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field>
                  <mat-label>Nombre</mat-label>
                  <input matInput formControlName="deceasedFirstName" placeholder="Nombre" />
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Apellido</mat-label>
                  <input matInput formControlName="deceasedLastName" placeholder="Apellido" />
                </mat-form-field>
              </div>

              <mat-divider />
              <h3 class="font-semibold text-gray-700">Configuración del evento</h3>

              <div class="flex items-center gap-4">
                <mat-slide-toggle formControlName="isPublic"> Evento público </mat-slide-toggle>
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
                  <mat-option value="AUTO">Automática (todos se publican)</mat-option>
                  <mat-option value="MANUAL">Manual (requiere aprobación)</mat-option>
                </mat-select>
              </mat-form-field>

              <div class="flex justify-end gap-3 pt-4">
                <a mat-stroked-button routerLink="/admin/streaming">Cancelar</a>
                <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  [disabled]="submitting() || form.invalid"
                >
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly submitting = signal(false);

  readonly isEdit = () => !!this.route.snapshot.paramMap.get('id');

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    ceremonyType: ['VELATORIO', Validators.required],
    estimatedDuration: [180],
    scheduledDate: ['', Validators.required],
    scheduledTime: ['', Validators.required],
    description: [''],
    deceasedFirstName: [''],
    deceasedLastName: [''],
    isPublic: [true],
    accessCode: [''],
    moderationMode: ['AUTO'],
  });

  constructor() {
    const editId = this.route.snapshot.paramMap.get('id');
    if (editId) this.loadEvent(editId);
  }

  private loadEvent(id: string): void {
    this.loading.set(true);
    this.api.findOne(id).subscribe({
      next: (ev) => {
        const date = ev.scheduledAt ? new Date(ev.scheduledAt) : new Date();
        this.form.patchValue({
          title: ev.title,
          ceremonyType: ev.ceremonyType,
          estimatedDuration: ev.estimatedDuration ?? 180,
          scheduledDate: date.toISOString().split('T')[0],
          scheduledTime: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
          description: ev.description ?? '',
          deceasedFirstName: ev.deceased?.firstName ?? '',
          deceasedLastName: ev.deceased?.lastName ?? '',
          isPublic: ev.isPublic,
          moderationMode: ev.moderationMode,
        });
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
    };

    if (deceasedFirstName && deceasedLastName) {
      dto.deceased = {
        firstName: deceasedFirstName,
        lastName: deceasedLastName,
      };
    }

    const editId = this.route.snapshot.paramMap.get('id');

    const request = editId ? this.api.update(editId, dto) : this.api.create(dto);

    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open(editId ? 'Evento actualizado' : 'Evento creado exitosamente', 'Cerrar', {
          duration: 3000,
        });
        this.router.navigate(['/admin/streaming']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err.message ?? 'Error al guardar', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
