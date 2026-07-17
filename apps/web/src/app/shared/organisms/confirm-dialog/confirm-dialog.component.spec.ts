import { TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  function createFixture(open: boolean, loading = false) {
    TestBed.configureTestingModule({ imports: [ConfirmDialogComponent] });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentInstance.open = open;
    fixture.componentInstance.title = 'Título';
    fixture.componentInstance.message = 'Mensaje';
    fixture.componentInstance.loading = loading;
    fixture.detectChanges();
    return fixture;
  }

  it('renders the dialog content when open is true', () => {
    const fixture = createFixture(true);

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-dialog-title');
    expect(fixture.nativeElement.textContent).toContain('Título');
  });

  it('does not render when open is false', () => {
    const fixture = createFixture(false);

    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });

  it('emits confirm when the confirm button is clicked', () => {
    const fixture = createFixture(true);
    let confirmed = false;
    fixture.componentInstance.confirm.subscribe(() => (confirmed = true));

    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();

    expect(confirmed).toBe(true);
  });

  it('emits cancel when the backdrop is clicked', () => {
    const fixture = createFixture(true);
    let cancelled = false;
    fixture.componentInstance.cancel.subscribe(() => (cancelled = true));

    fixture.nativeElement.querySelector('.confirm-dialog__backdrop').click();

    expect(cancelled).toBe(true);
  });

  it('prevents duplicate actions while loading', () => {
    const fixture = createFixture(true, true);
    const confirm = vi.fn();
    const cancel = vi.fn();
    fixture.componentInstance.confirm.subscribe(confirm);
    fixture.componentInstance.cancel.subscribe(cancel);
    const confirmButton = fixture.nativeElement.querySelector(
      '[data-testid="confirm-dialog-confirm"]',
    );
    const cancelButton = fixture.nativeElement.querySelector('.confirm-dialog__button--cancel');

    expect(confirmButton.disabled).toBe(true);
    expect(confirmButton.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Procesando…');
    confirmButton.click();
    cancelButton.click();
    fixture.componentInstance.onConfirm();
    fixture.componentInstance.onCancel();

    expect(confirm).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });
});
