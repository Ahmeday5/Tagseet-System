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
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import {
  FormMode,
  formModeSubmitLabel,
  formModeTitle,
} from '../../../../shared/models/form-mode.model';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';

import { ExpensesService } from '../../services/expenses.service';
import { ExpenseDto } from '../../models/expense.model';

/**
 * Create/edit-expense dialog.
 *
 *   <app-expense-form-modal
 *     [open]="expenseFormOpen()"
 *     [mode]="expenseModalMode()"
 *     [expense]="expenseBeingEdited()"
 *     [treasuries]="treasuryOptions()"
 *     [representatives]="representativeOptions()"
 *     (closed)="closeExpenseForm()"
 *     (saved)="onExpenseSaved($event)" />
 *
 * The form resets every time `open` flips to true so reopening never shows
 * stale state from the previous attempt.
 */
@Component({
  selector: 'app-expense-form-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './expense-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseFormModalComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();
  readonly mode = input.required<FormMode>();
  readonly expense = input<ExpenseDto | null>(null);
  readonly treasuries = input.required<
    { value: number | string; label: string }[]
  >();
  readonly representatives = input.required<
    { value: number | string; label: string }[]
  >();

  // ── outputs ──
  readonly closed = output<void>();
  readonly saved = output<ExpenseDto>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ExpensesService);
  private readonly toast = inject(ToastService);

  // ── reactive state ──
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  // ── derived ──
  protected readonly isCreate = computed(() => this.mode() === 'create');
  protected readonly title = computed(() =>
    formModeTitle(this.mode(), 'مصروف'),
  );
  protected readonly submitLabel = computed(() =>
    formModeSubmitLabel(this.mode()),
  );

  // ── form ──
  protected readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    treasuryId: this.fb.control<number | null>(null, [Validators.required]),
    representativeId: this.fb.control<number | null>(null),
    date: [todayIso(), [Validators.required]],
    notes: [''],
  });

  /**
   * Reactive view of `representativeId` — `toSignal` must be created once,
   * not inside a `computed()`, since it wraps a fresh subscription each call.
   * Drives the accrued-commission disclaimer below the representative
   * picker: the full expense amount now moves through the treasury; the
   * rep's commission is only tracked as owed and paid out later via the
   * dedicated commission-payout flow — it is no longer deducted here.
   */
  private readonly representativeIdSig = toSignal(
    this.form.controls.representativeId.valueChanges,
    { initialValue: this.form.controls.representativeId.value },
  );
  protected readonly hasRepresentative = computed(
    () => this.representativeIdSig() != null,
  );

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        this.serverError.set(null);
        this.submitting.set(false);
        this.resetFormToInputs();
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
    const isCreate = this.isCreate();
    this.serverError.set(null);
    this.submitting.set(true);

    const payload = {
      amount: Number(raw.amount) || 0,
      date: raw.date,
      treasuryId: Number(raw.treasuryId),
      notes: (raw.notes ?? '').trim() || undefined,
      representativeId: raw.representativeId ?? null,
    };

    const stream$ = isCreate
      ? this.service.create(payload)
      : this.service.update(this.expense()!.id, payload);

    stream$.subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.toast.success(
          isCreate ? `تم تسجيل ${res.expenseNumber} بنجاح` : 'تم حفظ التعديلات بنجاح',
        );
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

  private resetFormToInputs(): void {
    const e = this.expense();
    if (e && !this.isCreate()) {
      this.form.reset({
        amount: e.amount,
        treasuryId: e.treasuryId,
        representativeId: e.representativeId ?? null,
        date: toDateInput(e.date),
        notes: e.notes ?? '',
      });
      return;
    }

    this.form.reset({
      amount: 0,
      treasuryId: null,
      representativeId: null,
      date: todayIso(),
      notes: '',
    });
  }
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Normalizes a possibly-ISO-timestamp date string to `yyyy-MM-dd` for the date input. */
function toDateInput(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value;
}
