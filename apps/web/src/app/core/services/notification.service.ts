import { Injectable, signal } from '@angular/core';
import { getErrorMessage } from '../utils/error-message';

export type NotificationKind = 'success' | 'error' | 'warning' | 'info';
export type NotificationSeverity = 'success' | 'error' | 'warn' | 'info';

export interface ActiveNotification {
  id: number;
  severity: NotificationSeverity;
  icon: string;
  message: string;
}

const SEVERITY_BY_KIND: Record<NotificationKind, NotificationSeverity> = {
  success: 'success',
  error: 'error',
  warning: 'warn',
  info: 'info',
};

const ICON_BY_KIND: Record<NotificationKind, string> = {
  success: 'pi pi-check',
  error: 'pi pi-times-circle',
  warning: 'pi pi-exclamation-triangle',
  info: 'pi pi-info-circle',
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<ActiveNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(message: string): void {
    this.open(message, 'success', 4000);
  }

  error(message: string): void {
    // Los errores permanecen hasta que la persona los cierre.
    this.open(message, 'error');
  }

  warning(message: string): void {
    this.open(message, 'warning', 8000);
  }

  info(message: string): void {
    this.open(message, 'info', 5000);
  }

  apiError(error: unknown, fallback: string): void {
    this.error(getErrorMessage(error, fallback));
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._notifications.update((items) => items.filter((item) => item.id !== id));
  }

  private open(message: string, kind: NotificationKind, duration?: number): void {
    const id = this.nextId++;
    this._notifications.update((items) => [
      ...items,
      { id, severity: SEVERITY_BY_KIND[kind], icon: ICON_BY_KIND[kind], message },
    ]);

    if (duration !== undefined) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      );
    }
  }
}
