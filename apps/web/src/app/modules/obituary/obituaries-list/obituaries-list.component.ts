import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Obituary, ObituaryStatus } from '@zentic/shared-types';
import {
  ObituariesApiService,
  ObituaryEventOption,
} from '../../../core/services/obituaries-api.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/organisms/data-table/data-table.component';
import { BadgeColor, BadgeComponent } from '../../../shared/atoms/badge/badge.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import {
  ObituaryFormComponent,
  ObituaryFormSubmission,
} from '../obituary-form/obituary-form.component';

@Component({
  selector: 'app-obituaries-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    DataTableComponent,
    BadgeComponent,
    HasPermissionDirective,
    ObituaryFormComponent,
  ],
  templateUrl: './obituaries-list.component.html',
  styleUrl: './obituaries-list.component.scss',
})
export class ObituariesListComponent implements OnInit {
  private readonly obituariesApi = inject(ObituariesApiService);
  private readonly router = inject(Router);

  readonly obituaries = signal<Obituary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly search = signal('');
  readonly statusFilter = signal<ObituaryStatus | ''>('');

  readonly showForm = signal(false);
  readonly formError = signal('');
  readonly eventOptions = signal<ObituaryEventOption[]>([]);

  readonly statuses = Object.values(ObituaryStatus);

  readonly columns: DataTableColumn<Obituary>[] = [
    {
      key: 'slug',
      label: 'Difunto',
      format: (_value, row) => `${row.deceased.firstName} ${row.deceased.lastName}`,
    },
    { key: 'status', label: 'Estado' },
    {
      key: 'publishedAt',
      label: 'Publicado',
      format: (value) => (value ? new Date(value as string).toLocaleDateString() : '—'),
    },
  ];

  ngOnInit(): void {
    this.load();
    this.obituariesApi.listEvents().subscribe((events) => this.eventOptions.set(events));
  }

  load(): void {
    this.loading.set(true);
    this.obituariesApi
      .list({
        page: 1,
        limit: 100,
        search: this.search() || undefined,
        status: this.statusFilter() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.obituaries.set(result.data);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.load();
  }

  onStatusFilterChange(value: ObituaryStatus | ''): void {
    this.statusFilter.set(value);
    this.load();
  }

  statusBadgeColor(status: ObituaryStatus): BadgeColor {
    if (status === ObituaryStatus.PUBLISHED) return 'green';
    if (status === ObituaryStatus.ARCHIVED) return 'gray';
    return 'yellow';
  }

  openCreate(): void {
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  openDetail(obituary: Obituary): void {
    void this.router.navigate(['/admin/obituaries', obituary.id]);
  }

  onSave(submission: ObituaryFormSubmission): void {
    this.formError.set('');
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
      eventId: value.eventId || undefined,
      isPublic: value.isPublic,
      accessCode: value.isPublic ? undefined : value.accessCode || undefined,
    };

    this.obituariesApi.create(payload).subscribe({
      next: (created) => {
        if (photoFile) {
          this.obituariesApi.uploadPhoto(created.id, photoFile).subscribe({
            next: () => this.goToDetail(created.id),
            error: () => this.goToDetail(created.id),
          });
        } else {
          this.goToDetail(created.id);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(this.extractErrorMessage(error, 'No se pudo crear el obituario'));
      },
    });
  }

  private goToDetail(id: string): void {
    this.showForm.set(false);
    void this.router.navigate(['/admin/obituaries', id]);
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? fallback;
  }
}
