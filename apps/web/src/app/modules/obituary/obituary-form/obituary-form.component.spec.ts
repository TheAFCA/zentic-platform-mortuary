import { TestBed } from '@angular/core/testing';
import { MatNativeDateModule } from '@angular/material/core';
import { vi } from 'vitest';
import { ObituaryFormComponent } from './obituary-form.component';

describe('ObituaryFormComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [ObituaryFormComponent, MatNativeDateModule] });
    const fixture = TestBed.createComponent(ObituaryFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  function fillRequiredFields(fixture: ReturnType<typeof createFixture>) {
    fixture.componentInstance.form.patchValue({
      firstName: 'María',
      lastName: 'López',
    });
  }

  it('blocks submit and shows an error when the death date is in the future', () => {
    const fixture = createFixture();
    fillRequiredFields(fixture);
    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
    fixture.componentInstance.form.patchValue({
      deathDate: farFuture.toISOString().slice(0, 10),
    });

    const saveSpy = vi.fn();
    fixture.componentInstance.save.subscribe(saveSpy);
    fixture.componentInstance.submit();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.dateError()).toContain('fecha de fallecimiento');
  });

  it('blocks submit when birth date is after death date', () => {
    const fixture = createFixture();
    fillRequiredFields(fixture);
    fixture.componentInstance.form.patchValue({
      birthDate: '2020-01-01',
      deathDate: '1990-01-01',
    });

    const saveSpy = vi.fn();
    fixture.componentInstance.save.subscribe(saveSpy);
    fixture.componentInstance.submit();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.dateError()).toContain('fecha de nacimiento');
  });

  it('emits save with the form value when dates are valid', () => {
    const fixture = createFixture();
    fillRequiredFields(fixture);
    fixture.componentInstance.form.patchValue({
      birthDate: '1945-03-15',
      deathDate: '2026-07-01',
    });

    const saveSpy = vi.fn();
    fixture.componentInstance.save.subscribe(saveSpy);
    fixture.componentInstance.submit();

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        value: expect.objectContaining({ firstName: 'María', lastName: 'López' }),
        photoFile: null,
      }),
    );
  });

  it('does not emit save when required fields are missing', () => {
    const fixture = createFixture();
    const saveSpy = vi.fn();
    fixture.componentInstance.save.subscribe(saveSpy);

    fixture.componentInstance.submit();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });
});
