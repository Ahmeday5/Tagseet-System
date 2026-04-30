import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  inject,
  input,
  Optional,
  Self,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NgControl,
} from '@angular/forms';

/**
 * Reactive-Forms-friendly password input with a built-in show/hide toggle.
 *
 *   <app-password-input
 *     formControlName="password"
 *     placeholder="••••••••"
 *     autocomplete="new-password"
 *   />
 *
 * Implements ControlValueAccessor so it plugs into reactive forms exactly
 * like a native input — the parent never has to wire a custom binding.
 *
 * `is-invalid` styling is read from the bound NgControl and applied
 * automatically when the control is invalid + (touched || dirty), so the
 * markup at the call-site stays minimal.
 */
@Component({
  selector: 'app-password-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pw-wrap" [class.is-invalid]="isInvalid()">
      <input
        class="form-control pw-input"
        [type]="visible() ? 'text' : 'password'"
        [value]="value"
        [disabled]="disabled()"
        [placeholder]="placeholder()"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-invalid]="isInvalid() || null"
        (input)="onInput($event)"
        (blur)="onBlur()"
      />
      <button
        type="button"
        class="pw-toggle"
        [attr.aria-label]="
          visible() ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
        "
        [attr.aria-pressed]="visible()"
        [disabled]="disabled()"
        (click)="toggle()"
        tabindex="-1"
      >
        @if (visible()) {
          <!-- eye-off -->
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 3l18 18"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
            <path
              d="M10.6 6.2A10.7 10.7 0 0 1 12 6c5 0 9 4.5 10 6-0.5 0.8-1.6 2.3-3.2 3.6M6.2 7.2C4 8.7 2.5 10.7 2 12c1 1.5 5 6 10 6 1.6 0 3.1-.4 4.4-1.1"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M9.9 9.9a3 3 0 1 0 4.2 4.2"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        } @else {
          <!-- eye -->
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              stroke-width="1.5"
            />
          </svg>
        }
      </button>
    </div>
  `,
  styleUrl: './password-input.component.scss',
})
export class PasswordInputComponent implements ControlValueAccessor {
  readonly placeholder = input<string>('');
  readonly autocomplete = input<string>('current-password');

  protected readonly visible = signal(false);
  protected readonly disabled = signal(false);

  /** Local copy of the value — synced via writeValue() and (input). */
  protected value: string = '';

  /** ControlValueAccessor callbacks — assigned by Angular forms. */
  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  // ─────────── reflect form state from the bound NgControl ───────────
  // Self-injection of NgControl gives us access to the host directive's
  // status without forcing the consumer to pipe it through.
  constructor(@Self() @Optional() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  @HostBinding('class.is-invalid-host')
  protected get hostInvalid(): boolean {
    return this.isInvalid();
  }

  protected isInvalid(): boolean {
    const c = this.ngControl?.control;
    if (!c) return false;
    return !!(c.invalid && (c.touched || c.dirty));
  }

  // ─────────── ControlValueAccessor ───────────

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }
  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // ─────────── handlers ───────────

  protected onInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.value = v;
    this.onChange(v);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected toggle(): void {
    if (this.disabled()) return;
    this.visible.update((v) => !v);
  }
}
