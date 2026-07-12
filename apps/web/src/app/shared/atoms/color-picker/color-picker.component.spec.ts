import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ColorPickerComponent } from './color-picker.component';

describe('ColorPickerComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [ColorPickerComponent] });
    const fixture = TestBed.createComponent(ColorPickerComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('writes the initial value from writeValue', () => {
    const fixture = createFixture();
    fixture.componentInstance.writeValue('#123456');
    expect(fixture.componentInstance.value).toBe('#123456');
    expect(fixture.componentInstance.isValid).toBe(true);
  });

  it('falls back to a default value when writeValue receives an empty value', () => {
    const fixture = createFixture();
    fixture.componentInstance.writeValue('');
    expect(fixture.componentInstance.value).toBe('#000000');
  });

  it('propagates onSwatchChange to the registered onChange callback', () => {
    const fixture = createFixture();
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);

    fixture.componentInstance.onSwatchChange('#abcdef');

    expect(onChange).toHaveBeenCalledWith('#abcdef');
    expect(fixture.componentInstance.value).toBe('#abcdef');
  });

  it('only propagates onTextChange when the value is a valid hex color', () => {
    const fixture = createFixture();
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);

    fixture.componentInstance.onTextChange('not-a-color');
    expect(onChange).not.toHaveBeenCalled();
    expect(fixture.componentInstance.isValid).toBe(false);

    fixture.componentInstance.onTextChange('#00ff00');
    expect(onChange).toHaveBeenCalledWith('#00ff00');
  });
});
