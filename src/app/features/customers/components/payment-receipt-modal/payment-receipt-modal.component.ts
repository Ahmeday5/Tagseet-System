import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { PrintService } from '../../../../core/services/print.service';
import {
  InstallmentAllocation,
  InstallmentPaymentResult,
} from '../../models/client-statement.model';
import { formatAmount } from '../../utils/installment-schedule.util';

/** Who/what the receipt is for — shown on screen and on the printout. */
export interface PaymentReceiptContext {
  clientName: string;
  contractId: number;
  treasuryName: string | null;
}

/**
 * Confirmation shown right after a payment is recorded: the single voucher
 * created and how its amount was split across installments, with a print.
 */
@Component({
  selector: 'app-payment-receipt-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, CurrencyArPipe, DateArPipe],
  templateUrl: './payment-receipt-modal.component.html',
  styleUrl: './payment-receipt-modal.component.scss',
})
export class PaymentReceiptModalComponent {
  readonly open = input.required<boolean>();
  readonly result = input<InstallmentPaymentResult | null>(null);
  readonly context = input<PaymentReceiptContext | null>(null);

  readonly closed = output<void>();

  private readonly printer = inject(PrintService);

  protected print(): void {
    const r = this.result();
    if (!r) return;
    const ctx = this.context();

    this.printer.print<InstallmentAllocation>({
      title: 'سند قبض',
      subtitle: r.voucherNumber,
      meta: [
        { label: 'رقم السند', value: r.voucherNumber },
        { label: 'المبلغ', value: formatAmount(r.amount) },
        ...(ctx
          ? [
              { label: 'العميل', value: ctx.clientName },
              { label: 'العقد', value: `#${ctx.contractId}` },
            ]
          : []),
        ...(ctx?.treasuryName ? [{ label: 'الخزينة', value: ctx.treasuryName }] : []),
      ],
      columns: [
        { key: 'sequence', header: 'رقم القسط', align: 'center', format: (v) => `قسط ${v}` },
        { key: 'amount', header: 'المبلغ المسدد', align: 'end', format: 'currency', bold: true },
      ],
      totals: {
        label: 'الإجمالي',
        cells: [formatAmount(r.amount)],
      },
      rows: r.allocations,
      showRowCount: false,
    });
  }
}
