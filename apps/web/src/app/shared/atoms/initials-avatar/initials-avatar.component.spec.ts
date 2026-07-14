import { TestBed } from '@angular/core/testing';
import { InitialsAvatarComponent } from './initials-avatar.component';

describe('InitialsAvatarComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [InitialsAvatarComponent] });
    return TestBed.createComponent(InitialsAvatarComponent);
  }

  it('computes initials from firstName and lastName', () => {
    const fixture = createFixture();
    fixture.componentInstance.firstName = 'María';
    fixture.componentInstance.lastName = 'López';
    fixture.detectChanges();

    expect(fixture.componentInstance.initials).toBe('ML');
  });

  it('falls back to a question mark when both names are empty', () => {
    const fixture = createFixture();
    fixture.componentInstance.firstName = '';
    fixture.componentInstance.lastName = '';
    fixture.detectChanges();

    expect(fixture.componentInstance.initials).toBe('?');
  });

  it('returns a deterministic color for the same name', () => {
    const fixture = createFixture();
    fixture.componentInstance.firstName = 'Juan';
    fixture.componentInstance.lastName = 'Pérez';
    fixture.detectChanges();

    const first = fixture.componentInstance.backgroundColor;
    const second = fixture.componentInstance.backgroundColor;
    expect(first).toBe(second);
    expect(first).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns different colors for different names (in most cases)', () => {
    // backgroundColor es un getter puro — no requiere detectChanges() para leerlo.
    const fixture = createFixture();

    fixture.componentInstance.firstName = 'Ana';
    fixture.componentInstance.lastName = 'Ruiz';
    const colorA = fixture.componentInstance.backgroundColor;

    fixture.componentInstance.firstName = 'Carlos';
    fixture.componentInstance.lastName = 'Gómez';
    const colorB = fixture.componentInstance.backgroundColor;

    expect(colorA).not.toBe(colorB);
  });
});
