import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { getErrorMessage } from '../utils/error-message';

export type NotificationKind = 'success' | 'error' | 'warning' | 'info';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

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

  private open(message: string, kind: NotificationKind, duration?: number): void {
    const config: MatSnackBarConfig = {
      announcementMessage: message,
      politeness: kind === 'error' ? 'assertive' : 'polite',
      panelClass: ['zentic-notification', `zentic-notification--${kind}`],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    };
    if (duration !== undefined) config.duration = duration;
    this.snackBar.open(message, 'Cerrar', config);
  }
}
