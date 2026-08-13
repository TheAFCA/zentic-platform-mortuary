import { TestBed } from '@angular/core/testing';
import { TenantModuleTogglesComponent } from './tenant-module-toggles.component';

describe('TenantModuleTogglesComponent', () => {
  function createFixture(value: string[] = []) {
    TestBed.configureTestingModule({ imports: [TenantModuleTogglesComponent] });
    const fixture = TestBed.createComponent(TenantModuleTogglesComponent);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a checkbox per configurable module (8 total, no Dashboard/Usuarios/Marca/Cuenta)', () => {
    const fixture = createFixture();

    const checkboxes = fixture.nativeElement.querySelectorAll('mat-checkbox');
    expect(checkboxes.length).toBe(8);
    const labels = Array.from(checkboxes).map((el) => (el as HTMLElement).textContent?.trim());
    expect(labels).not.toContain('Dashboard');
    expect(labels).not.toContain('Usuarios');
  });

  it('reflects the initial value as checked', () => {
    const fixture = createFixture(['leads', 'venues']);

    expect(fixture.componentInstance.isChecked('leads')).toBe(true);
    expect(fixture.componentInstance.isChecked('venues')).toBe(true);
    expect(fixture.componentInstance.isChecked('obituaries')).toBe(false);
  });

  it('emits the updated array when a module is toggled on', () => {
    const fixture = createFixture(['leads']);
    const emitted: string[][] = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

    fixture.componentInstance.toggle('venues', true);

    expect(emitted[0]).toEqual(expect.arrayContaining(['leads', 'venues']));
  });

  it('emits the updated array when a module is toggled off', () => {
    const fixture = createFixture(['leads', 'venues']);
    const emitted: string[][] = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

    fixture.componentInstance.toggle('venues', false);

    expect(emitted[0]).toEqual(['leads']);
  });
});
