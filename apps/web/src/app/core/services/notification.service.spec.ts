import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    snackBar.open.mockReset();
    TestBed.configureTestingModule({
      providers: [NotificationService, { provide: MatSnackBar, useValue: snackBar }],
    });
  });

  it('announces successful operations politely and closes automatically', () => {
    TestBed.inject(NotificationService).success('Cambios guardados');

    expect(snackBar.open).toHaveBeenCalledWith(
      'Cambios guardados',
      'Cerrar',
      expect.objectContaining({
        duration: 4000,
        politeness: 'polite',
        panelClass: ['zentic-notification', 'zentic-notification--success'],
      }),
    );
  });

  it('keeps errors visible and announces them assertively', () => {
    TestBed.inject(NotificationService).error('No fue posible guardar');

    const config = snackBar.open.mock.calls[0][2];
    expect(config).toEqual(
      expect.objectContaining({
        politeness: 'assertive',
        panelClass: ['zentic-notification', 'zentic-notification--error'],
      }),
    );
    expect(config.duration).toBeUndefined();
  });
});
