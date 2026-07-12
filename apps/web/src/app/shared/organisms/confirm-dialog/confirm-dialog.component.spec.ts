import { TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  function createFixture(open: boolean) {
    TestBed.configureTestingModule({ imports: [ConfirmDialogComponent] });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentInstance.open = open;
    fixture.componentInstance.title = 'Título';
    fixture.componentInstance.message = 'Mensaje';
    fixture.detectChanges();
    return fixture;
  }

  it('renders the dialog content when open is true', () => {
    const fixture = createFixture(true);

    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeTruthy();
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
});
