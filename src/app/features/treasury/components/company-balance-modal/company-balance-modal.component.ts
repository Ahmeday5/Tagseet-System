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
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

import { ShareholdersService } from '../../services/shareholders.service';
import { CompanyBalanceTransactionPayload } from '../../models/shareholder.model';

type CompanyTxType = CompanyBalanceTransactionPayload['type'];

/**
 * Direct deposit (`Receipt`) / withdrawal (`Payment`) on the company balance.
 * The resulting entries show up in the treasury operations log, where they're
 * edited/deleted like any other operation.
 */
@Component({
  selector: 'app-company-balance-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent, CurrencyArPipe],
  templateUrl: './company-balance-modal.component.html',
})
export class CompanyBalanceModalComponent {
  readonly open = input.required<boolean>();
  /** Current company balance — shown with a live projection. */
  readonly balance = input<number>(0);

  readonly closed = output<void>();
  readonly saved = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ShareholdersService);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly draftType = signal<CompanyTxType>('Receipt');
  protected readonly draftAmount = signal(0);

  protected readonly typeOptions: ReadonlyArray<{ value: CompanyTxType; label: string }> = [
    { value: 'Receipt', label: 'إيداع' },
    { value: 'Payment', label: 'سحب' },
  ];

  protected readonly projected = computed(
    () =>
      this.balance() +
      (this.draftType() === 'Receipt' ? this.draftAmount() : -this.draftAmount()),
  );

  protected readonly form = this.fb.nonNullable.group({
    type: ['Receipt' as CompanyTxType, [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [todayIso(), [Validators.required]],
    notes: [''],
  });

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        this.submitting.set(false);
        this.serverError.set(null);
        this.draftType.set('Receipt');
        this.draftAmount.set(0);
        this.form.reset({ type: 'Receipt', amount: 0, date: todayIso(), notes: '' });
      },
      { allowSignalWrites: true },
    );
  }

  protected onTypeChange(value: string): void {
    this.draftType.set(value as CompanyTxType);
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
    this.serverError.set(null);
    this.submitting.set(true);

    this.service
      .createCompanyBalanceTransaction({
        type: raw.type,
        amount: Number(raw.amount) || 0,
        date: raw.date,
        notes: raw.notes.trim() || null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success(
            raw.type === 'Receipt'
              ? 'تم الإيداع في رصيد الشركة بنجاح'
              : 'تم السحب من رصيد الشركة بنجاح',
          );
          this.saved.emit();
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.serverError.set(apiErrorToMessage(err, 'تعذّر تنفيذ العملية على رصيد الشركة'));
        },
      });
  }

  protected close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
