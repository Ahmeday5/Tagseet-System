import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AmountArPipe } from '../../../../../shared/pipes/amount-ar.pipe';
import { MonthlySalesProfit, MonthlyTable } from '../../../models/treasury.model';
import { PROFITS_HINTS } from '../../../constants/profits-hints.const';

type SalesFigure = Exclude<keyof MonthlySalesProfit, 'month' | 'monthName' | 'isCurrentMonth'>;

/** Column order (RTL, after the month column) — drives header, body and total. */
const COLUMNS: ReadonlyArray<{ key: SalesFigure; label: string }> = [
  { key: 'cashProfit', label: 'أرباح الكاش' },
  { key: 'installmentProfit', label: 'أرباح القسط' },
  { key: 'salesProfit', label: 'أرباح المبيعات' },
  { key: 'collectedProfit', label: 'الأرباح المحصلة' },
  { key: 'directRevenues', label: 'الإيرادات المباشرة' },
];

/** "أرباح المبيعات الشهرية" — 12 months plus the yearly total row. */
@Component({
  selector: 'app-monthly-sales-profits-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountArPipe],
  templateUrl: './monthly-sales-profits-table.component.html',
  styleUrl: './monthly-sales-profits-table.component.scss',
})
export class MonthlySalesProfitsTableComponent {
  readonly table = input.required<MonthlyTable<MonthlySalesProfit>>();

  protected readonly columns = COLUMNS;
  protected readonly hints = PROFITS_HINTS;
}
