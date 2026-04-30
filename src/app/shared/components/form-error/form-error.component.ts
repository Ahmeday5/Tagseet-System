import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { firstError } from '../../utils/form-validation.util';

/**
 * Renders the most relevant validation message for a given control.
 *
 *   <app-form-error [control]="form.controls.email" label="البريد الإلكتروني" />
 *
 * Returns nothing while the control is pristine + untouched, so the form
 * doesn't shout at the user before they've interacted.
 */
@Component({
  selector: 'app-form-error',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as msg) {
      <div class="invalid-feedback d-block app-form-error">{{ msg }}</div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .app-form-error {
        font-size: 10.5px;
        color: var(--re);
        margin-top: 3px;
        line-height: 1.4;
      }
    `,
  ],
})
export class FormErrorComponent {
  readonly control = input.required<AbstractControl | null | undefined>();
  readonly label = input.required<string>();
  /**
   * Set to `true` when you want the error to appear regardless of touched/
   * dirty (e.g. on submit attempt). The parent typically calls
   * `form.markAllAsTouched()` instead, so default is fine.
   */
  readonly forceShow = input<boolean>(false);

  protected readonly message = computed(() => {
    const ctrl = this.control();
    if (!ctrl) return null;
    if (this.forceShow()) {
      return firstError(ctrl, this.label()) ?? null;
    }
    return firstError(ctrl, this.label());
  });
}
