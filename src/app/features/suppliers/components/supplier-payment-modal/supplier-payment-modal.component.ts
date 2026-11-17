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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { LookupItem } from '../../../../core/models/lookup.model';

import { TreasuryService } from '../../../treasury/services/treasury.service';
import { SuppliersService } from '../../services/suppliers.service';
import {
  Supplier,
  SupplierPaymentPayload,
  SupplierPaymentResponse,
  SupplierStatementPayment,
} from '../../models/supplier.model';

/**
 * Records a direct supplier payment, or edits one (`[editing]` set) — same
 * form, pre-filled. A representative's ceiling is their own invoices' balance;
 * in edit mode the server owns that check (its 400 message is shown verbatim)
 * because the client can't know the balance net of the payment being edited.
 */
@Component({
  selector: 'app-supplier-payment-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
    CurrencyArPipe,
  ],
  templateUrl: './supplier-payment-modal.component.html',
  styleUrl: './supplier-payment-modal.component.scss',
})
export class SupplierPaymentModalComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();
  readonly supplier = input<Supplier | null>(null);
  /** When set, the modal edits this payment instead of recording a new one. */
  readonly editing = input<SupplierStatementPayment | null>(null);

  // ── outputs ──
  readonly closed = output<void>();
  readonly paid = output<SupplierPaymentResponse>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly suppliersService = inject(SuppliersService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly toast = inject(ToastService);

  // ── state ──
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly treasuries = signal<LookupItem[]>([]);
  protected readonly loadingTreasuries = signal(false);
  protected readonly draftAmount = signal(0);

  // ── derived ──
  protected readonly isEdit = computed(() => this.editing() !== null);

  protected readonly remaining = computed(
    () => this.supplier()?.remainingAmount ?? 0,
  );

  protected readonly projectedOwed = computed(() =>
    Math.max(0, this.remaining() - this.draftAmount()),
  );

  /** Client-side ceiling applies to new payments only (see class doc). */
  protected readonly amountExceedsRemaining = computed(
    () => !this.isEdit() && this.draftAmount() > this.remaining() + 1e-9,
  );

  protected readonly treasuryOptions = computed<SearchableSelectOption[]>(() =>
    this.treasuries().map((t) => ({ value: t.id, label: t.name })),
  );

  // ── form ──
  protected readonly form = this.fb.nonNullable.group({
    treasuryId: this.fb.control<number | null>(null, [Validators.required]),
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentDate: [this.todayISO(), [Validators.required]],
    notes: [''],
  });

  constructor() {
    effect(
      () => {
        const sup = this.supplier();
        if (!this.open() || !sup) return;
        const editing = this.editing();
        this.serverError.set(null);
        this.submitting.set(false);

        if (editing) {
          this.draftAmount.set(editing.amount);
          this.form.reset({
            treasuryId: editing.treasuryId ?? null,
            amount: editing.amount,
            paymentDate: editing.date ? editing.date.slice(0, 10) : this.todayISO(),
            notes: editing.notes ?? '',
          });
        } else {
          const remaining = sup.remainingAmount ?? 0;
          this.draftAmount.set(remaining);
          this.form.reset({
            treasuryId: null,
            amount: remaining,
            paymentDate: this.todayISO(),
            notes: '',
          });
        }
        this.loadTreasuries();
      },
      { allowSignalWrites: true },
    );
  }

  // ─────────── template handlers ───────────

  protected onAmountChange(value: string): void {
    this.draftAmount.set(Number(value) || 0);
  }

  protected useFullRemaining(): void {
    const amount = Number(this.remaining().toFixed(2));
    this.form.controls.amount.setValue(amount);
    this.draftAmount.set(amount);
  }

  protected onSubmit(): void {
    if (this.submitting()) return;
    const sup = this.supplier();
    if (!sup) return;

    if (this.form.invalid || this.amountExceedsRemaining()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const editing = this.editing();
    const notes = (raw.notes ?? '').trim();
    const payload: SupplierPaymentPayload = {
      treasuryId: Number(raw.treasuryId),
      amount: Number(raw.amount),
      paymentDate: raw.paymentDate,
      // On edit an empty string clears the notes; on create it's simply omitted.
      notes: editing ? notes : notes || undefined,
    };
    this.serverError.set(null);
    this.submitting.set(true);

    const stream$ = editing
      ? this.suppliersService.updatePayment(sup.id, editing.id, payload)
      : this.suppliersService.pay(sup.id, payload);

    stream$.subscribe({
      next: (res) => {
        this.submitting.set(false);
        const amount = `${payload.amount.toLocaleString('ar-EG')} ج.م`;
        this.toast.success(
          editing
            ? `تم تعديل الدفعة إلى ${amount} بنجاح`
            : `تم تسجيل دفعة ${amount} للمورد ${res.supplierName ?? sup.fullName}`,
        );
        this.paid.emit(res);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(
          err.message || (editing ? 'تعذّر تعديل الدفعة' : 'تعذّر تسجيل الدفعة'),
        );
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

  // ─────────── internals ───────────

  private loadTreasuries(): void {
    if (this.treasuries().length > 0) return;
    this.loadingTreasuries.set(true);
    this.treasuryService.lookup().subscribe({
      next: (list) => {
        this.treasuries.set(list ?? []);
        this.loadingTreasuries.set(false);
      },
      error: () => {
        this.treasuries.set([]);
        this.loadingTreasuries.set(false);
      },
    });
  }

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
