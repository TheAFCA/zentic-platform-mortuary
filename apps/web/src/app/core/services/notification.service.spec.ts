import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [NotificationService] });
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes successful operations and auto-dismisses them after 4s', () => {
    service.success('Cambios guardados');

    expect(service.notifications()).toEqual([
      expect.objectContaining({
        severity: 'success',
        icon: 'pi pi-check',
        message: 'Cambios guardados',
      }),
    ]);

    vi.advanceTimersByTime(4000);

    expect(service.notifications()).toEqual([]);
  });

  it('keeps errors visible until manually dismissed', () => {
    service.error('No fue posible guardar');

    const [notification] = service.notifications();
    expect(notification).toEqual(
      expect.objectContaining({
        severity: 'error',
        icon: 'pi pi-times-circle',
        message: 'No fue posible guardar',
      }),
    );

    vi.advanceTimersByTime(60_000);
    expect(service.notifications()).toHaveLength(1);

    service.dismiss(notification.id);
    expect(service.notifications()).toEqual([]);
  });

  it('stacks multiple active notifications', () => {
    service.warning('Sesión por expirar');
    service.info('Nuevo mensaje recibido');

    expect(service.notifications()).toHaveLength(2);
    expect(service.notifications()[0]).toEqual(
      expect.objectContaining({ severity: 'warn', icon: 'pi pi-exclamation-triangle' }),
    );
    expect(service.notifications()[1]).toEqual(
      expect.objectContaining({ severity: 'info', icon: 'pi pi-info-circle' }),
    );
  });

  it('apiError() falls back to the provided message and surfaces it as an error', () => {
    service.apiError(new Error('boom'), 'Fallback');

    expect(service.notifications()[0]).toEqual(
      expect.objectContaining({ severity: 'error', message: 'boom' }),
    );
  });
});
