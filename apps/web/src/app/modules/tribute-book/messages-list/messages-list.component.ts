import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MessageOrigin, MessageStatus, TributeMessage } from '@zentic/shared-types';
import { TributeBookApiService } from '../../../core/services/tribute-book-api.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/organisms/data-table/data-table.component';
import { BadgeColor, BadgeComponent } from '../../../shared/atoms/badge/badge.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ConfirmDialogComponent } from '../../../shared/organisms/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-messages-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    DataTableComponent,
    BadgeComponent,
    HasPermissionDirective,
    ConfirmDialogComponent,
  ],
  templateUrl: './messages-list.component.html',
  styleUrl: './messages-list.component.scss',
})
export class MessagesListComponent implements OnInit {
  private readonly api = inject(TributeBookApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly messages = signal<TributeMessage[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly statusFilter = signal<MessageStatus | ''>('');
  readonly originFilter = signal<MessageOrigin | ''>('');
  readonly trashed = signal(false);
  /** Cuando la vista llega con ?eventId= o ?obituaryId=, queda fijada a ese contexto. */
  eventId: string | null = null;
  obituaryId: string | null = null;

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly bulkApproving = signal(false);

  readonly showGenerateDialog = signal(false);
  readonly generating = signal(false);
  readonly generateError = signal('');
  includeStreamingMessages = true;
  includeObituaryMessages = true;

  readonly statuses = Object.values(MessageStatus);

  readonly columns: DataTableColumn<TributeMessage>[] = [
    { key: 'origin', label: 'Origen', format: (value) => this.originLabel(value as MessageOrigin) },
    { key: 'authorName', label: 'Autor' },
    {
      key: 'content',
      label: 'Mensaje',
      format: (value) => {
        const text = value as string;
        return text.length > 80 ? `${text.slice(0, 80)}…` : text;
      },
    },
    { key: 'status', label: 'Estado' },
    {
      key: 'createdAt',
      label: 'Fecha',
      format: (value) => new Date(value as string).toLocaleString(),
    },
  ];

  get canGenerate(): boolean {
    return !!this.eventId || !!this.obituaryId;
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.eventId = params.get('eventId');
    this.obituaryId = params.get('obituaryId');
    const origin = params.get('origin');
    if (origin === 'STREAMING' || origin === 'OBITUARY') this.originFilter.set(origin);

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .listMessages({
        status: this.statusFilter() || undefined,
        origin: this.originFilter() || undefined,
        eventId: this.eventId ?? undefined,
        obituaryId: this.obituaryId ?? undefined,
        trashed: this.trashed(),
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (result) => {
          this.messages.set(result.data);
          this.total.set(result.total);
          this.loading.set(false);
          this.selectedIds.set(new Set());
        },
        error: () => this.loading.set(false),
      });
  }

  onFilterChange(): void {
    this.load();
  }

  toggleTrashed(): void {
    this.trashed.set(!this.trashed());
    this.load();
  }

  rowId(row: TributeMessage): string {
    return row.id;
  }

  onSelectionChange(ids: Set<string>): void {
    this.selectedIds.set(ids);
  }

  originLabel(origin: MessageOrigin): string {
    return origin === 'STREAMING' ? 'Streaming' : 'Obituario';
  }

  statusBadgeColor(status: MessageStatus): BadgeColor {
    if (status === MessageStatus.APPROVED) return 'green';
    if (status === MessageStatus.REJECTED) return 'red';
    return 'yellow';
  }

  approve(message: TributeMessage): void {
    this.api.approve(message.id, message.origin).subscribe({
      next: () => this.load(),
      error: (error: HttpErrorResponse) => this.error.set(this.extractErrorMessage(error)),
    });
  }

  reject(message: TributeMessage): void {
    this.api.reject(message.id, message.origin).subscribe({
      next: () => this.load(),
      error: (error: HttpErrorResponse) => this.error.set(this.extractErrorMessage(error)),
    });
  }

  remove(message: TributeMessage): void {
    this.api.softDelete(message.id, message.origin).subscribe({
      next: () => this.load(),
      error: (error: HttpErrorResponse) => this.error.set(this.extractErrorMessage(error)),
    });
  }

  restore(message: TributeMessage): void {
    this.api.restore(message.id, message.origin).subscribe({
      next: () => this.load(),
      error: (error: HttpErrorResponse) => this.error.set(this.extractErrorMessage(error)),
    });
  }

  bulkApprove(): void {
    const items = this.messages()
      .filter((m) => this.selectedIds().has(m.id))
      .map((m) => ({ id: m.id, origin: m.origin }));
    if (items.length === 0) return;

    this.bulkApproving.set(true);
    this.api.bulkApprove({ items }).subscribe({
      next: () => {
        this.bulkApproving.set(false);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.bulkApproving.set(false);
        this.error.set(this.extractErrorMessage(error));
      },
    });
  }

  openGenerateDialog(): void {
    this.generateError.set('');
    this.showGenerateDialog.set(true);
  }

  cancelGenerate(): void {
    this.showGenerateDialog.set(false);
  }

  confirmGenerate(): void {
    this.generating.set(true);
    this.generateError.set('');
    this.api
      .generate({
        eventId: this.eventId ?? undefined,
        obituaryId: this.obituaryId ?? undefined,
        includeStreamingMessages: this.includeStreamingMessages,
        includeObituaryMessages: this.includeObituaryMessages,
      })
      .subscribe({
        next: () => {
          this.generating.set(false);
          this.showGenerateDialog.set(false);
          void this.router.navigate(['/admin/tribute-book/history']);
        },
        error: (error: HttpErrorResponse) => {
          this.generating.set(false);
          this.generateError.set(this.extractErrorMessage(error));
        },
      });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? 'Ocurrió un error inesperado';
  }
}
