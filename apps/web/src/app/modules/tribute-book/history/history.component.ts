import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { interval, startWith, switchMap } from 'rxjs';
import { TributeBookGeneration, TributeBookStatus } from '@zentic/shared-types';
import { TributeBookApiService } from '../../../core/services/tribute-book-api.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/organisms/data-table/data-table.component';
import { BadgeColor, BadgeComponent } from '../../../shared/atoms/badge/badge.component';

const REFRESH_INTERVAL_MS = 5_000;

@Component({
  selector: 'app-tribute-book-history',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, DataTableComponent, BadgeComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent implements OnInit {
  private readonly api = inject(TributeBookApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly generations = signal<TributeBookGeneration[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly downloadingId = signal<string | null>(null);

  readonly columns: DataTableColumn<TributeBookGeneration>[] = [
    {
      key: 'eventId',
      label: 'Origen',
      format: (_value, row) =>
        row.eventId ? `Evento ${row.eventId.slice(-6)}` : `Obituario ${row.obituaryId?.slice(-6)}`,
    },
    { key: 'messageCount', label: 'Mensajes' },
    { key: 'status', label: 'Estado' },
    {
      key: 'createdAt',
      label: 'Generado',
      format: (value) => new Date(value as string).toLocaleString(),
    },
    {
      key: 'expiresAt',
      label: 'Disponible hasta',
      format: (value) => (value ? new Date(value as string).toLocaleString() : '—'),
    },
  ];

  ngOnInit(): void {
    interval(REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.api.history()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.generations.set(result.data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  statusBadgeColor(status: TributeBookStatus): BadgeColor {
    if (status === TributeBookStatus.READY) return 'green';
    if (status === TributeBookStatus.ERROR) return 'red';
    return 'yellow';
  }

  download(generation: TributeBookGeneration): void {
    this.error.set('');
    this.downloadingId.set(generation.id);
    this.api.download(generation.id).subscribe({
      next: (blob) => {
        this.downloadingId.set(null);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `libro-homenajes-${generation.id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error: HttpErrorResponse) => {
        this.downloadingId.set(null);
        this.error.set(this.extractErrorMessage(error));
      },
    });
  }

  retry(generation: TributeBookGeneration): void {
    this.error.set('');
    this.api
      .generate({
        eventId: generation.eventId ?? undefined,
        obituaryId: generation.obituaryId ?? undefined,
      })
      .subscribe({
        error: (error: HttpErrorResponse) => this.error.set(this.extractErrorMessage(error)),
      });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? 'Ocurrió un error inesperado';
  }
}
