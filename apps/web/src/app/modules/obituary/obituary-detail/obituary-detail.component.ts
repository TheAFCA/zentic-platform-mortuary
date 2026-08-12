import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Obituary, ObituaryStatus, Venue } from '@zentic/shared-types';
import { ObituariesApiService } from '../../../core/services/obituaries-api.service';
import { VenuesApiService } from '../../../core/services/venues-api.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { InitialsAvatarComponent } from '../../../shared/atoms/initials-avatar/initials-avatar.component';
import { BadgeColor, BadgeComponent } from '../../../shared/atoms/badge/badge.component';
import { ConfirmDialogComponent } from '../../../shared/organisms/confirm-dialog/confirm-dialog.component';
import {
  ObituaryFormComponent,
  ObituaryFormSubmission,
  ObituaryFormValue,
} from '../obituary-form/obituary-form.component';
import { FeedbackBannerComponent } from '../../../shared/molecules/feedback-banner/feedback-banner.component';
import { NotificationService } from '../../../core/services/notification.service';
import { getErrorMessage } from '../../../core/utils/error-message';

@Component({
  selector: 'app-obituary-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    HasPermissionDirective,
    InitialsAvatarComponent,
    BadgeComponent,
    ConfirmDialogComponent,
    ObituaryFormComponent,
    FeedbackBannerComponent,
  ],
  templateUrl: './obituary-detail.component.html',
  styleUrl: './obituary-detail.component.scss',
})
export class ObituaryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly obituariesApi = inject(ObituariesApiService);
  private readonly venuesApi = inject(VenuesApiService);
  private readonly notifications = inject(NotificationService);

  readonly obituary = signal<Obituary | null>(null);
  readonly venues = signal<Venue[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly actionLoading = signal(false);

  readonly editing = signal(false);
  readonly formError = signal('');
  // Signal seteado explícitamente en openEdit(), no un método plano invocado en el template:
  // un método plano devuelve una referencia nueva en cada ciclo de detección de cambios
  // (cada tecla presionada dentro del form hijo), lo que dispara ngOnChanges y pisa lo que
  // el usuario acaba de escribir (mismo bug ya documentado y corregido en venues/clients/
  // invitation-detail — este componente se había quedado fuera de esa corrección).
  readonly editingFormValue = signal<ObituaryFormValue | null>(null);

  readonly confirmUnpublish = signal(false);
  readonly actionError = signal('');

  get publicUrl(): string {
    const obituary = this.obituary();
    if (!obituary) return '';
    return `${window.location.origin}/o/${obituary.slug}`;
  }

  statusBadgeColor(status: ObituaryStatus): BadgeColor {
    if (status === ObituaryStatus.PUBLISHED) return 'green';
    if (status === ObituaryStatus.ARCHIVED) return 'gray';
    return 'yellow';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.load(id);
    this.venuesApi.list().subscribe({
      next: (venues) => this.venues.set(venues),
      error: (error: unknown) =>
        this.notifications.apiError(error, 'No se pudieron cargar las sedes'),
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.loadError.set('');
    this.obituariesApi.get(id).subscribe({
      next: (obituary) => {
        this.obituary.set(obituary);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(error, 'No se pudo cargar el obituario'));
      },
    });
  }

  private buildFormValue(obituary: Obituary): ObituaryFormValue {
    return {
      firstName: obituary.deceased.firstName,
      lastName: obituary.deceased.lastName,
      birthDate: obituary.deceased.birthDate?.slice(0, 10) ?? '',
      deathDate: obituary.deceased.deathDate?.slice(0, 10) ?? '',
      birthCity: obituary.deceased.birthCity ?? '',
      deathCity: obituary.deceased.deathCity ?? '',
      epitaph: obituary.deceased.epitaph ?? '',
      biography: obituary.deceased.biography ?? '',
      serviceType: obituary.serviceType ?? 'VELATORIO',
      serviceAt: obituary.serviceAt ?? '',
      roomId: obituary.roomId ?? '',
      isPublic: obituary.isPublic,
      accessCode: obituary.accessCode ?? '',
    };
  }

  openEdit(): void {
    const obituary = this.obituary();
    if (!obituary) return;
    this.formError.set('');
    this.editingFormValue.set(this.buildFormValue(obituary));
    this.editing.set(true);
  }

  closeEdit(): void {
    this.editing.set(false);
  }

  onSave(submission: ObituaryFormSubmission): void {
    const obituary = this.obituary();
    if (!obituary || this.saving()) return;

    this.formError.set('');
    this.saving.set(true);
    const { value, photoFile } = submission;

    const payload = {
      firstName: value.firstName,
      lastName: value.lastName,
      birthDate: value.birthDate || undefined,
      deathDate: value.deathDate || undefined,
      birthCity: value.birthCity || undefined,
      deathCity: value.deathCity || undefined,
      biography: value.biography || undefined,
      epitaph: value.epitaph || undefined,
      serviceType: value.serviceType || undefined,
      serviceAt: value.serviceAt || undefined,
      roomId: value.roomId || undefined,
      isPublic: value.isPublic,
      accessCode: value.isPublic ? undefined : value.accessCode || undefined,
    };

    this.obituariesApi.update(obituary.id, payload).subscribe({
      next: () => {
        if (photoFile) {
          this.obituariesApi.uploadPhoto(obituary.id, photoFile).subscribe({
            next: () => {
              this.notifications.success('Obituario y fotografía actualizados');
              this.finishEdit(obituary.id);
            },
            error: (error: unknown) => {
              this.notifications.apiError(
                error,
                'El obituario se actualizó, pero no se pudo subir la fotografía',
              );
              this.finishEdit(obituary.id);
            },
          });
        } else {
          this.notifications.success('Obituario actualizado');
          this.finishEdit(obituary.id);
        }
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(getErrorMessage(error, 'No se pudo guardar el obituario'));
      },
    });
  }

  private finishEdit(id: string): void {
    this.saving.set(false);
    this.editing.set(false);
    this.load(id);
  }

  publish(): void {
    const obituary = this.obituary();
    if (!obituary || this.actionLoading()) return;

    this.actionError.set('');
    this.actionLoading.set(true);
    this.obituariesApi.publish(obituary.id).subscribe({
      next: (updated) => {
        this.actionLoading.set(false);
        this.obituary.set(updated);
        this.notifications.success('Obituario publicado');
      },
      error: (error: unknown) => {
        this.actionLoading.set(false);
        this.actionError.set(getErrorMessage(error, 'No se pudo publicar el obituario'));
      },
    });
  }

  requestUnpublish(): void {
    this.confirmUnpublish.set(true);
  }

  cancelUnpublish(): void {
    this.confirmUnpublish.set(false);
  }

  confirmUnpublishAction(): void {
    const obituary = this.obituary();
    if (!obituary || this.actionLoading()) return;

    this.actionError.set('');
    this.actionLoading.set(true);
    this.obituariesApi.unpublish(obituary.id).subscribe({
      next: (updated) => {
        this.actionLoading.set(false);
        this.confirmUnpublish.set(false);
        this.obituary.set(updated);
        this.notifications.success('Obituario despublicado');
      },
      error: (error: unknown) => {
        this.actionLoading.set(false);
        this.actionError.set(getErrorMessage(error, 'No se pudo despublicar el obituario'));
      },
    });
  }

  createStreamingFromObituary(): void {
    const obituary = this.obituary();
    if (!obituary) return;
    void this.router.navigate(['/admin/streaming/new'], {
      queryParams: { fromObituary: obituary.id },
    });
  }

  viewStreaming(): void {
    const obituary = this.obituary();
    if (!obituary?.eventId) return;
    void this.router.navigate(['/admin/streaming', obituary.eventId]);
  }

  openTributeBook(): void {
    const obituary = this.obituary();
    if (!obituary) return;
    void this.router.navigate(['/admin/tribute-book'], {
      queryParams: { origin: 'OBITUARY', obituaryId: obituary.id },
    });
  }

  copyPublicUrl(): void {
    void navigator.clipboard
      .writeText(this.publicUrl)
      .then(() => this.notifications.success('Enlace copiado'))
      .catch(() => this.notifications.error('No se pudo copiar el enlace'));
  }

  goBack(): void {
    void this.router.navigate(['/admin/obituaries']);
  }

  retryLoad(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }
}
