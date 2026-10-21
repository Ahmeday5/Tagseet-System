import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { translatePaymentNote } from '../../../../core/utils/payment-note.util';
import {
  ContractInstallmentRow,
  ContractPaymentKind,
  ContractPaymentRow,
  InstallmentAllocation,
} from '../../models/client-statement.model';
import { allocationLabel } from '../../utils/installment-schedule.util';

const KIND_LABELS: Record<ContractPaymentKind, string> = {
  Installment: 'قسط',
  DownPayment: 'مقدم',
};

/**
 * Receipt vouchers of a contract — one row per voucher, with the
 * installments it covered as chips. Presentational only.
 */
@Component({
  selector: 'app-contract-payments-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, CurrencyArPipe, DateArPipe],
  templateUrl: './contract-payments-table.component.html',
  styleUrl: './contract-payments-table.component.scss',
})
export class ContractPaymentsTableComponent {
  readonly payments = input.required<ContractPaymentRow[]>();
  /** Used to flag partial allocations ("(جزئي)"). */
  readonly installments = input<ContractInstallmentRow[]>([]);
  readonly busyVoucherId = input<number | null>(null);

  readonly edit = output<ContractPaymentRow>();
  readonly remove = output<ContractPaymentRow>();

  protected kindLabel(kind: ContractPaymentKind): string {
    return KIND_LABELS[kind] ?? kind;
  }

  protected chipLabel(allocation: InstallmentAllocation): string {
    return allocationLabel(allocation, this.installments());
  }

  protected noteText(notes: string | null): string {
    return translatePaymentNote(notes) || '—';
  }
}
