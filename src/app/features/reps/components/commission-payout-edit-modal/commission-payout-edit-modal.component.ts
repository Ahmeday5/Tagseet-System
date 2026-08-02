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
import { TreasuryService } from '../../../treasury/services/treasury.service';
import { RepsService } from '../../services/reps.service';
import { CommissionPayoutRow } from '../../models/rep.model';

/**
 * Admin: edits a previously recorded commission payout voucher
 * (`PUT representatives/commission-payouts/{id}`).
 */
@Component({
  selector: 'app-commission-payout-edit-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './commission-payout-edit-modal.component.html',
})
export class CommissionPayoutEditModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly treasuryService = inject(TreasuryService);
  private readonly service = inject(RepsService);
  private readonly toast = inject(ToastService);

  readonly open = input.required<boolean>();
  readonly payout = input<CommissionPayoutRow | null>(null);

  readonly closed = output<void>();
  readonly saved = output<CommissionPayoutRow>();

  protected readonly submitting = signal(false);
  protected readonly treasuries = signal<SearchableSelectOption[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    treasuryId: [null as number | null, [Validators.required]],
    date: ['', [Validators.required]],
    notes: [''],
  });

  constructor() {
    // Load treasury options + prefill the form each time the modal opens.
    effect(
      () => {
        const p = this.payout();
        if (!this.open() || !p) return;

        this.form.reset({
          amount: p.amount,
          treasuryId: p.treasuryId,
          date: p.date.slice(0, 10),
          notes: p.notes ?? '',
        });

        this.treasuryService.lookup().subscribe({
          next: (list) =>
            this.treasuries.set(
              list.map((t) => ({ value: t.id, label: t.name })),
            ),
          error: () => this.treasuries.set([]),
        });
      },
      { allowSignalWrites: true },
    );
  }

  protected submit(): void {
    const p = this.payout();
    if (!p) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.service
      .updateCommissionPayout(p.id, {
        amount: Number(this.form.controls.amount.value),
        treasuryId: Number(this.form.controls.treasuryId.value),
        date: this.form.controls.date.value,
        notes: this.form.controls.notes.value.trim(),
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.toast.success('تم تعديل سند صرف العمولة بنجاح');
          this.saved.emit(res);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.toast.error(apiErrorToMessage(err, 'تعذّر تعديل سند صرف العمولة'));
        },
      });
  }
}
