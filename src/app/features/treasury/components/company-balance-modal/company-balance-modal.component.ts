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
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

import { ShareholdersService } from '../../services/shareholders.service';
import { CapitalClassificationsService } from '../../services/capital-classifications.service';
import { CapitalClassification } from '../../models/capital-classification.model';
import { ShareholderTreasuryLookup } from '../../models/shareholder-treasury-lookup.model';
import {
  CompanyBalanceEditKind,
  CompanyBalanceEditTarget,
  CompanyBalanceTransactionPayload,
  CompanyBalanceTransactionType,
} from '../../models/shareholder.model';

type TypeOption = { value: CompanyBalanceTransactionType; label: string };

const TYPE_OPTIONS: Readonly<Record<CompanyBalanceEditKind, readonly TypeOption[]>> = {
  Adjustment: [
    { value: 'Receipt', label: 'إيداع' },
    { value: 'Payment', label: 'سحب' },
  ],
  Transfer: [
    { value: 'Receipt', label: 'تحويل وارد إلى رصيد الشركة' },
    { value: 'Payment', label: 'تحويل صادر من رصيد الشركة' },
  ],
  Voucher: [
    { value: 'Receipt', label: 'قبض' },
    { value: 'Payment', label: 'صرف' },
  ],
};

const EDIT_TITLES: Readonly<Record<CompanyBalanceEditKind, string>> = {
  Adjustment: 'تعديل عملية رصيد الشركة',
  Transfer: 'تعديل تحويل من رصيد الشركة',
  Voucher: 'تعديل سند على رصيد الشركة',
};

/**
 * Create (`[editing]` null) a direct deposit (`Receipt`) / withdrawal
 * (`Payment`) on the company balance, or edit (`[editing]` set) any editable
 * company-balance line. A deposit moves real cash into the chosen treasury and
 * raises the balance; a withdrawal takes cash out of it and lowers the balance.
 *
 * Edit behaviour follows the line's kind (see `CompanyBalanceEditKind`): legacy
 * transfers edit their other treasury with a fixed direction; other payment
 * vouchers have no treasury (ignored server-side) and a fixed type.
 */
@Component({
  selector: 'app-company-balance-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
    CurrencyArPipe,
  ],
  templateUrl: './company-balance-modal.component.html',
})
export class CompanyBalanceModalComponent {
  readonly open = input.required<boolean>();
  /** Current company balance — shown with a live projection (create mode). */
  readonly balance = input<number>(0);
  /** When set, the modal opens in edit mode pre-filled with this line. */
  readonly editing = input<CompanyBalanceEditTarget | null>(null);

  readonly closed = output<void>();
  readonly saved = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ShareholdersService);
  private readonly classificationsService = inject(CapitalClassificationsService);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly draftType = signal<CompanyBalanceTransactionType>('Receipt');
  protected readonly draftAmount = signal(0);

  // ── treasuries (required) ──
  private readonly treasuries = signal<ShareholderTreasuryLookup[]>([]);
  protected readonly treasuriesLoading = signal(false);
  protected readonly treasuryOptions = computed<SearchableSelectOption[]>(() =>
    this.treasuries().map((t) => ({
      value: t.id,
      label: t.name,
      hint: t.representativeName ?? undefined,
    })),
  );

  // ── capital classifications (optional) ──
  private readonly classifications = signal<CapitalClassification[]>([]);
  protected readonly classificationsLoading = signal(false);
  protected readonly classificationOptions = computed<SearchableSelectOption[]>(() =>
    this.classifications().map((c) => ({ value: c.id, label: c.name })),
  );

  protected readonly isEdit = computed(() => this.editing() !== null);

  /** Create mode is always a deposit/withdrawal. */
  protected readonly kind = computed<CompanyBalanceEditKind>(
    () => this.editing()?.kind ?? 'Adjustment',
  );

  protected readonly title = computed(() =>
    this.isEdit() ? EDIT_TITLES[this.kind()] : 'رصيد الشركة — إيداع / سحب',
  );

  /** Only deposits/withdrawals may flip direction; other lines keep their type. */
  protected readonly typeLocked = computed(() => this.kind() !== 'Adjustment');

  /** Non-adjustment vouchers carry no treasury — the server ignores it. */
  protected readonly showTreasury = computed(() => this.kind() !== 'Voucher');

  protected readonly treasuryLabel = computed(() =>
    this.kind() === 'Transfer' ? 'الخزينة الأخرى في التحويل' : 'الخزينة',
  );

  /**
   * A line recorded without a treasury. It may stay without one: on PUT a null
   * `treasuryId` keeps the current (empty) treasury.
   */
  protected readonly isLegacy = computed(() => {
    const editing = this.editing();
    return editing !== null && editing.kind !== 'Voucher' && editing.treasuryId == null;
  });

  protected readonly typeOptions = computed(() => TYPE_OPTIONS[this.kind()]);

  /** Balance after saving — in edit mode the original movement is backed out first. */
  protected readonly projected = computed(() => {
    const signed = (type: CompanyBalanceTransactionType, amount: number) =>
      type === 'Receipt' ? amount : -amount;
    const editing = this.editing();
    const original = editing ? signed(editing.type, editing.amount) : 0;
    return this.balance() - original + signed(this.draftType(), this.draftAmount());
  });

  protected readonly form = this.fb.nonNullable.group({
    type: ['Receipt' as CompanyBalanceTransactionType, [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [todayIso(), [Validators.required]],
    treasuryId: this.fb.control<number | null>(null, [Validators.required]),
    capitalClassificationId: this.fb.control<number | null>(null),
    notes: [''],
  });

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        const editing = this.editing();

        this.submitting.set(false);
        this.serverError.set(null);
        this.loadTreasuries();
        this.loadClassifications();

        // Required on create, and on edit when the line already has one —
        // except plain vouchers, whose treasury the server ignores.
        const treasuryRequired =
          !editing || (editing.kind !== 'Voucher' && editing.treasuryId != null);
        this.form.controls.treasuryId.setValidators(
          treasuryRequired ? [Validators.required] : [],
        );
        if (editing && editing.kind !== 'Adjustment') {
          this.form.controls.type.disable({ emitEvent: false });
        } else {
          this.form.controls.type.enable({ emitEvent: false });
        }

        if (editing) {
          this.draftType.set(editing.type);
          this.draftAmount.set(editing.amount);
          this.form.reset({
            type: editing.type,
            amount: editing.amount,
            date: toDateInput(editing.date),
            treasuryId: editing.treasuryId,
            capitalClassificationId: editing.capitalClassificationId,
            notes: editing.notes ?? '',
          });
        } else {
          this.draftType.set('Receipt');
          this.draftAmount.set(0);
          this.form.reset({
            type: 'Receipt',
            amount: 0,
            date: todayIso(),
            treasuryId: null,
            capitalClassificationId: null,
            notes: '',
          });
        }
      },
      { allowSignalWrites: true },
    );
  }

  protected onTypeChange(value: string): void {
    this.draftType.set(value as CompanyBalanceTransactionType);
  }

  protected onAmountChange(value: string): void {
    this.draftAmount.set(Number(value) || 0);
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CompanyBalanceTransactionPayload = {
      type: raw.type,
      amount: Number(raw.amount) || 0,
      date: raw.date,
      treasuryId: raw.treasuryId != null ? Number(raw.treasuryId) : null,
      capitalClassificationId: raw.capitalClassificationId
        ? Number(raw.capitalClassificationId)
        : null,
      notes: raw.notes.trim() || null,
    };

    const editing = this.editing();
    this.serverError.set(null);
    this.submitting.set(true);

    const stream$ = editing
      ? this.service.updateCompanyBalanceTransaction(editing.id, editing.source, payload)
      : this.service.createCompanyBalanceTransaction(payload);

    stream$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success(this.successMessage(editing, raw.type));
        this.saved.emit();
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(
          apiErrorToMessage(err, 'تعذّر تنفيذ العملية على رصيد الشركة'),
        );
      },
    });
  }

  protected close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  private successMessage(
    editing: CompanyBalanceEditTarget | null,
    type: CompanyBalanceTransactionType,
  ): string {
    if (editing) return 'تم تعديل عملية رصيد الشركة بنجاح';
    return type === 'Receipt'
      ? 'تم الإيداع في رصيد الشركة بنجاح'
      : 'تم السحب من رصيد الشركة بنجاح';
  }

  private loadTreasuries(): void {
    if (this.treasuries().length) return;
    this.treasuriesLoading.set(true);
    this.service.treasuriesLookup().subscribe({
      next: (list) => {
        this.treasuries.set(list ?? []);
        this.treasuriesLoading.set(false);
      },
      error: () => {
        this.treasuries.set([]);
        this.treasuriesLoading.set(false);
      },
    });
  }

  private loadClassifications(): void {
    if (this.classifications().length) return;
    this.classificationsLoading.set(true);
    this.classificationsService.listAll().subscribe({
      next: (list) => {
        this.classifications.set(list ?? []);
        this.classificationsLoading.set(false);
      },
      error: () => {
        this.classifications.set([]);
        this.classificationsLoading.set(false);
      },
    });
  }
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Server dates arrive as ISO datetimes; `<input type="date">` wants `yyyy-MM-dd`. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return todayIso();
  return value.slice(0, 10);
}
