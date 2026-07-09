import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';

import { SubAccountTransfer } from '../../models/sub-account.model';
import { SubAccountsService } from '../../services/sub-accounts.service';

/**
 * Inter-sub-account transfer dialog.
 *
 *   <app-sub-account-transfer-modal
 *     [open]="transferOpen()"
 *     [accounts]="accountOptions()"
 *     (closed)="closeTransfer()"
 *     (saved)="onTransferSaved($event)" />
 *
 * The form resets every time `open` flips to true so reopening never shows
 * stale state from the previous attempt. `fromSubAccountId` and
 * `toSubAccountId` must differ — enforced via a form-level validator.
 */
@Component({
  selector: 'app-sub-account-transfer-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './sub-account-transfer-modal.component.html',
  styleUrl: './sub-account-transfer-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubAccountTransferModalComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();
  readonly accounts = input.required<SearchableSelectOption[]>();

  // ── outputs ──
  readonly closed = output<void>();
  readonly saved = output<SubAccountTransfer>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SubAccountsService);
  private readonly toast = inject(ToastService);

  // ── reactive state ──
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  // ── form ──
  protected readonly form = this.fb.nonNullable.group(
    {
      fromSubAccountId: [null as number | null, [Validators.required]],
      toSubAccountId: [null as number | null, [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      transferDate: [todayIso(), [Validators.required]],
      notes: [''],
    },
    { validators: [distinctAccountsValidator()] },
  );

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        this.serverError.set(null);
        this.submitting.set(false);
        this.resetForm();
      },
      { allowSignalWrites: true },
    );
  }

  protected onSubmit(): void {
    if (this.submitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.serverError.set(null);
    this.submitting.set(true);

    this.service
      .createTransfer({
        fromSubAccountId: Number(raw.fromSubAccountId),
        toSubAccountId: Number(raw.toSubAccountId),
        amount: Number(raw.amount) || 0,
        transferDate: raw.transferDate,
        notes: (raw.notes ?? '').trim(),
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.toast.success('تم التحويل بنجاح');
          this.saved.emit(res);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.serverError.set(err.message);
        },
      });
  }

  protected close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  protected isInvalid(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  /** Form-level error shown under the "to" select when both are equal. */
  protected showSameAccountError(): boolean {
    const err = this.form.errors?.['sameAccount'];
    if (!err) return false;
    return this.form.controls.toSubAccountId.touched;
  }

  // ── internals ──

  private resetForm(): void {
    this.form.reset({
      fromSubAccountId: null,
      toSubAccountId: null,
      amount: 0,
      transferDate: todayIso(),
      notes: '',
    });
  }
}

/** Cross-field validator: `fromSubAccountId` must differ from `toSubAccountId`. */
function distinctAccountsValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const from = group.get('fromSubAccountId')?.value;
    const to = group.get('toSubAccountId')?.value;
    if (from == null || to == null) return null;
    return Number(from) === Number(to) ? { sameAccount: true } : null;
  };
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
