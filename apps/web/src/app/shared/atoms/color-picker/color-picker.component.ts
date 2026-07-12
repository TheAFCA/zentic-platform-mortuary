import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorPickerComponent),
      multi: true,
    },
  ],
})
export class ColorPickerComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() disabled = false;

  value = '#000000';
  onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  get isValid(): boolean {
    return HEX_COLOR.test(this.value);
  }

  writeValue(v: string): void {
    this.value = v || '#000000';
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onSwatchChange(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  onTextChange(value: string): void {
    this.value = value;
    if (HEX_COLOR.test(value)) {
      this.onChange(value);
    }
  }
}
