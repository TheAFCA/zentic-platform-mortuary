import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      input {
        display: block;
        width: 100%;
        min-height: 3.25rem;
        padding: 0.875rem 1rem;
        border: 1px solid #d6dbe3;
        border-radius: 0.95rem;
        background: rgba(255, 255, 255, 0.98);
        color: #111827;
        font-size: 0.96rem;
        line-height: 1.25rem;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease,
          transform 160ms ease,
          background-color 160ms ease;
      }

      input::placeholder {
        color: #9ca3af;
      }

      input:focus {
        border-color: var(--brand-primary, #0f5e59);
        box-shadow: 0 0 0 4px rgba(15, 94, 89, 0.12);
        outline: none;
        transform: translateY(-1px);
      }

      input:disabled {
        background: #f3f4f6;
        color: #9ca3af;
        cursor: not-allowed;
      }
    `,
  ],
  template: `
    <input
      [type]="type"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [value]="value"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;

  value = '';
  onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(v: string) {
    this.value = v ?? '';
  }
  registerOnChange(fn: (v: string) => void) {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  onInput(event: Event) {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
}
