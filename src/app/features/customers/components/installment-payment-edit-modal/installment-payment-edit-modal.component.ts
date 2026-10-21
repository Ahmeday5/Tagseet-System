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
import { FormsModule } from '@angular/forms';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { LookupItem } from '../../../../core/models/lookup.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { translatePaymentNote } from '../../../../core/utils/payment-note.util';
import { InstallmentsService } from '../../services/installments.service';
import {
  ContractInstallmentRow,
  ContractPaymentRow,
  InstallmentPaymentResult,
  UpdateInstallmentPaymentPayload,
} from '../../models/client-statement.model';
import { describeAllocations } from '../../utils/installment-schedule.util';

interface EditPaymentForm {
  amount: number;
  treasuryId: number | null;
  /** `yyyy-MM-dd` */
  date: string;
  notes: string;
}

const EMPTY_FORM: EditPaymentForm = { amount: 0, treasuryId: null, date: '', notes: '' };

/**
 * Edits a whole installment payment voucher (amount, treasury, date, notes).
 * Unchanged date/notes are sent as `null` so the backend keeps its stored
 * values verbatim. The max amount is enforced server-side; its 400 message
 * is shown as-is.
 */
@Component({
  selector: 'app-installment-payment-edit-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent, CurrencyArPipe],
  templateUrl: './installment-payment-edit-modal.component.html',
  styleUrl: './installment-payment-edit-modal.component.scss',
})
export class InstallmentPaymentEditModalComponent {
  readonly open = input.required<boolean>();
  readonly payment = input<ContractPaymentRow | null>(null);
  /** Same role-scoped list used by the "pay installment" form. */
  readonly treasuries = input<LookupItem[]>([]);
  /** Used to flag partial allocations in the coverage hint. */
  readonly installments = input<ContractInstallmentRow[]>([]);

  readonly closed = output<void>();
  readonly saved = output<InstallmentPaymentResult>();

  private readonly installmentsService = inject(InstallmentsService);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);
  protected readonly form = signal<EditPaymentForm>(EMPTY_FORM);
  /** Snapshot of the pre-filled values — to detect untouched date/notes. */
  private readonly initial = signal<EditPaymentForm>(EMPTY_FORM);

  /**
   * The voucher's current treasury may be outside the lookup (e.g. a
   * deactivated one) — keep it selectable so the select doesn't render blank.
   */
  protected readonly treasuryOptions = computed<LookupItem[]>(() => {
    const list = this.treasuries();
    const p = this.payment();
    if (!p?.treasuryId || list.some((t) => t.id === p.treasuryId)) return list;
    return [{ id: p.treasuryId, name: p.treasuryName ?? `#${p.treasuryId}` }, ...list];
  });

  protected readonly coverage = computed(() => {
    const p = this.payment();
    return p ? describeAllocations(p.installments, this.installments()) : '';
  });

  constructor() {
    effect(
      () => {
        const p = this.payment();
        if (!this.open() || !p) return;
        const prefilled: EditPaymentForm = {
          amount: p.amount,
          treasuryId: p.treasuryId,
          date: p.date?.split('T')[0] ?? '',
          notes: translatePaymentNote(p.notes) ?? '',
        };
        this.initial.set(prefilled);
        this.form.set(prefilled);
        this.submitting.set(false);
      },
      { allowSignalWrites: true },
    );
  }

  protected update<K extends keyof EditPaymentForm>(key: K, value: EditPaymentForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  protected submit(): void {
    const p = this.payment();
    const f = this.form();
    if (!p || this.submitting()) return;

    const amount = Number(f.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.toast.error('أدخل مبلغًا أكبر من صفر');
      return;
    }
    if (!f.treasuryId) {
      this.toast.error('اختر الخزينة');
      return;
    }

    const initial = this.initial();
    const payload: UpdateInstallmentPaymentPayload = {
      amount,
      treasuryId: f.treasuryId,
      paymentDate: f.date && f.date !== initial.date ? `${f.date}T00:00:00` : null,
      notes: f.notes !== initial.notes ? f.notes.trim() : null,
    };

    this.submitting.set(true);
    this.installmentsService.updatePayment(p.id, payload).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.toast.success(`تم تعديل السند ${p.voucherNumber} بنجاح`);
        this.saved.emit(result);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.toast.error(apiErrorToMessage(err, 'فشل تعديل السند'));
      },
    });
  }
}
