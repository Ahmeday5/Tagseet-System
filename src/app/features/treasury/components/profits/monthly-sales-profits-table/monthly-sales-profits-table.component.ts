import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AmountArPipe } from '../../../../../shared/pipes/amount-ar.pipe';
import { MonthlySalesProfit, MonthlyTable } from '../../../models/treasury.model';
import { PROFITS_HINTS } from '../../../constants/profits-hints.const';
import { ProfitInfoComponent } from '../profit-info/profit-info.component';

type SalesFigure = Exclude<keyof MonthlySalesProfit, 'month' | 'monthName' | 'isCurrentMonth'>;

interface SalesColumn {
  key: SalesFigure;
  label: string;
  hint: string;
  /** `sub` = breakdown of collectedProfit, shown only when expanded. */
  tone?: 'expense' | 'net' | 'sub';
}

const field = (key: SalesFigure): string => `MonthlySalesProfits.${key}`;

const COLLECTED_BREAKDOWN: readonly SalesColumn[] = [
  {
    key: 'collectedFromInstallments',
    label: 'من الأقساط',
    hint: PROFITS_HINTS.collectedFromInstallments,
    tone: 'sub',
  },
  {
    key: 'collectedFromCashSales',
    label: 'من البيع الكاش',
    hint: PROFITS_HINTS.collectedFromCashSales,
    tone: 'sub',
  },
];

const BEFORE_BREAKDOWN: readonly SalesColumn[] = [
  { key: 'cashProfit', label: 'أرباح الكاش', hint: PROFITS_HINTS.cashProfit },
  { key: 'installmentProfit', label: 'أرباح القسط', hint: PROFITS_HINTS.installmentProfit },
  { key: 'salesProfit', label: 'أرباح المبيعات', hint: PROFITS_HINTS.salesProfit },
  { key: 'collectedProfit', label: 'الأرباح المحصلة', hint: PROFITS_HINTS.collectedProfit },
];

const AFTER_BREAKDOWN: readonly SalesColumn[] = [
  { key: 'directRevenues', label: 'الإيرادات المباشرة', hint: PROFITS_HINTS.directRevenues },
  { key: 'expenses', label: 'المصروفات', hint: PROFITS_HINTS.expenses, tone: 'expense' },
  { key: 'netProfit', label: 'صافي الأرباح', hint: PROFITS_HINTS.netProfit, tone: 'net' },
];

/**
 * "أرباح المبيعات الشهرية" — 12 months plus the yearly total row.
 * The collected-profit column expands into its two sources on demand.
 */
@Component({
  selector: 'app-monthly-sales-profits-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountArPipe, NgTemplateOutlet, ProfitInfoComponent],
  templateUrl: './monthly-sales-profits-table.component.html',
  styleUrl: './monthly-sales-profits-table.component.scss',
})
export class MonthlySalesProfitsTableComponent {
  readonly table = input.required<MonthlyTable<MonthlySalesProfit>>();

  protected readonly field = field;
  protected readonly collectedExpanded = signal(false);

  protected readonly columns = computed<readonly SalesColumn[]>(() => [
    ...BEFORE_BREAKDOWN,
    ...(this.collectedExpanded() ? COLLECTED_BREAKDOWN : []),
    ...AFTER_BREAKDOWN,
  ]);
}
