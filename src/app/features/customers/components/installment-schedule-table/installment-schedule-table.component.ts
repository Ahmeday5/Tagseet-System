import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { translatePaymentNote } from '../../../../core/utils/payment-note.util';
import {
  ContractInstallmentRow,
  ContractPaymentRow,
} from '../../models/client-statement.model';
import {
  ScheduleLine,
  buildScheduleLines,
  installmentStatusBadge,
  installmentStatusLabel,
} from '../../utils/installment-schedule.util';

/**
 * Installments schedule with every payment part listed under its
 * installment (row-spanned number / due date / amount cells), so a single
 * installment paid in several vouchers — possibly from different treasuries
 * — shows each part with its own edit/delete actions.
 *
 * Presentational only: actions emit the owning payment voucher; the parent
 * performs the request and refetches.
 */
@Component({
  selector: 'app-installment-schedule-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, CurrencyArPipe, DateArPipe],
  templateUrl: './installment-schedule-table.component.html',
  styleUrl: './installment-schedule-table.component.scss',
})
export class InstallmentScheduleTableComponent {
  readonly installments = input.required<ContractInstallmentRow[]>();
  /** Used to resolve each part's voucher (and its edit/delete permissions). */
  readonly payments = input.required<ContractPaymentRow[]>();
  /** Voucher currently being mutated — its actions are disabled. */
  readonly busyVoucherId = input<number | null>(null);

  readonly edit = output<ContractPaymentRow>();
  readonly remove = output<ContractPaymentRow>();

  protected readonly lines = computed(() =>
    buildScheduleLines(this.installments()),
  );

  private readonly paymentsById = computed(
    () => new Map(this.payments().map((p) => [p.id, p])),
  );

  protected readonly statusLabel = installmentStatusLabel;
  protected readonly statusBadge = installmentStatusBadge;

  protected paymentOf(line: ScheduleLine): ContractPaymentRow | null {
    return line.part ? (this.paymentsById().get(line.part.voucherId) ?? null) : null;
  }

  protected progressPercent(it: ContractInstallmentRow): number {
    if (it.dueAmount <= 0) return 0;
    return Math.min(100, Math.round((it.paidAmount / it.dueAmount) * 100));
  }

  protected noteText(notes: string | null): string {
    return translatePaymentNote(notes) || '';
  }
}
