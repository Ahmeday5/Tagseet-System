import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { firstError } from '../../utils/form-validation.util';

/**
 * Renders the most relevant validation message for a given control.
 *
 *   <app-form-error [control]="form.controls.email" label="البريد الإلكتروني" />
 *
 * Returns nothing while the control is pristine + untouched, so the form
 * doesn't shout at the user before they've interacted.
 *
 * ── Why the manual `tick` signal? ──────────────────────────────────────
 * `AbstractControl.errors / touched / dirty` are plain mutable properties
 * — NOT signals — so a `computed()` over `this.control()` would never
 * re-run when the user types or blurs. We subscribe to the control's
 * `events` stream (Angular 18+) and bump a counter signal on each event,
 * which gives the `message` computed the reactive dependency it needs.
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

  /** Bumped on every status/value/touched/dirty change of the bound control. */
  private readonly tick = signal(0);

  constructor() {
    effect(
      (onCleanup) => {
        const ctrl = this.control();
        if (!ctrl) return;

        const sub = ctrl.events.subscribe(() => {
          this.tick.update((v) => v + 1);
        });
        onCleanup(() => sub.unsubscribe());
      },
      { allowSignalWrites: true },
    );
  }

  protected readonly message = computed(() => {
    this.tick(); // reactive dependency — forces re-evaluation on control events
    const ctrl = this.control();
    if (!ctrl) return null;
    if (this.forceShow()) {
      return firstError(ctrl, this.label()) ?? null;
    }
    return firstError(ctrl, this.label());
  });
}
