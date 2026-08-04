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
        padding: 0.75rem 1rem;
        border: 1px solid var(--border, #e7e9ee);
        border-radius: var(--radius-md, 0.85rem);
        background: #fff;
        color: var(--ink, #1f2937);
        font-size: 0.92rem;
        line-height: 1.5;
        box-shadow: var(--shadow-xs, 0 1px 2px rgba(15, 23, 42, 0.04));
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease,
          background-color 150ms ease;
      }

      input::placeholder {
        color: var(--muted-light, #9ca3af);
      }

      input:focus {
        border-color: var(--brand-primary, #0f5e59);
        box-shadow: 0 0 0 4px var(--brand-primary-light, rgba(15, 94, 89, 0.12));
        outline: none;
        background: #fff;
      }

      input:disabled {
        background: var(--surface, #f9fafb);
        color: var(--muted-light, #9ca3af);
        cursor: not-allowed;
      }

      input[readonly] {
        background: var(--surface, #f9fafb);
        cursor: default;
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
