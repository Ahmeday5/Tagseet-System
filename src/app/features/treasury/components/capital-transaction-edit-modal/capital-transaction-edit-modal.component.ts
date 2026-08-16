import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { ShareholdersService } from '../../services/shareholders.service';
import { CapitalTransaction, CapitalTransactionType } from '../../models/capital-transaction.model';
import { CAPITAL_TX_TYPE_OPTIONS } from '../../constants/capital-transaction-labels';

/**
 * Edits a previously recorded capital deposit/withdrawal
 * (`PUT shareholders/{id}/capital-transactions/{txId}`).
 *
 * Only rows with direction `Deposit`/`Withdrawal` (server type `Receipt`/`Payment`)
 * are editable — profit-capitalisation rows never reach this modal (see the
 * `editable` guard in `shareholder-capital-modal.component.ts`).
 */
@Component({
  selector: 'app-capital-transaction-edit-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './capital-transaction-edit-modal.component.html',
})
export class CapitalTransactionEditModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ShareholdersService);
  private readonly toast = inject(ToastService);

  readonly open = input.required<boolean>();
  readonly shareholderId = input<number | null>(null);
  readonly transaction = input<CapitalTransaction | null>(null);
  readonly treasuries = input<SearchableSelectOption[]>([]);

  readonly closed = output<void>();
  readonly saved = output<CapitalTransaction>();

  protected readonly submitting = signal(false);
  protected readonly typeOptions = CAPITAL_TX_TYPE_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    type: [CapitalTransactionType.Receipt, [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    treasuryId: this.fb.control<number | null>(null, [Validators.required]),
    date: ['', [Validators.required]],
    notes: [''],
  });

  constructor() {
    // Prefill the form each time the modal opens for a (new) transaction.
    effect(
      () => {
        const tx = this.transaction();
        if (!this.open() || !tx) return;

        this.form.reset({
          type: tx.type,
          amount: tx.amount,
          treasuryId: tx.treasuryId,
          date: tx.date.slice(0, 10),
          notes: tx.notes ?? '',
        });
      },
      { allowSignalWrites: true },
    );
  }

  protected submit(): void {
    const shareholderId = this.shareholderId();
    const tx = this.transaction();
    if (!shareholderId || !tx) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitting.set(true);
    this.service
      .updateCapitalTransaction(shareholderId, tx.id, {
        type: raw.type,
        amount: Number(raw.amount) || 0,
        treasuryId: Number(raw.treasuryId),
        date: raw.date,
        notes: raw.notes.trim(),
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.toast.success('تم تعديل عملية رأس المال بنجاح');
          this.saved.emit(res);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.toast.error(apiErrorToMessage(err, 'تعذّر تعديل عملية رأس المال'));
        },
      });
  }
}
