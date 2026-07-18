import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';
import { TributeBookApiService } from './tribute-book-api.service';

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Badge de mensajes pendientes del sidebar (HU-TRIB-003). No hay WebSocket global a nivel de
 * shell, así que sigue el mismo patrón de polling ya usado en el dashboard.
 */
@Injectable({ providedIn: 'root' })
export class PendingMessagesBadgeService {
  private readonly api = inject(TributeBookApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly count = signal(0);
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    interval(REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.api.pendingCount()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => this.count.set(result.count),
        error: () => undefined,
      });
  }
}
