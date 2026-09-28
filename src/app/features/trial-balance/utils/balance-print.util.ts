import { PrintConfig } from '../../../core/services/print.service';
import { BalanceSideView, BalanceView } from '../models/balance-view.model';
import { formatAmount, formatPercent } from './balance-format.util';

export interface BalancePrintRow {
  readonly side: string;
  readonly label: string;
  readonly detail: string;
  readonly share: string;
  readonly amount: number;
}

/**
 * Flattens the trial balance into one printable table: every line of each
 * side followed by that side's subtotal, with the difference as the footer.
 * Amounts keep their piastres — `PrintService`'s built-in currency format
 * rounds, which would hide exactly the differences this report is about.
 */
export function buildBalancePrintConfig(view: BalanceView): PrintConfig<BalancePrintRow> {
  return {
    title: 'ميزان المراجعة',
    subtitle: 'مقارنة إجمالي الأصول بإجمالي الالتزامات',
    showRowCount: false,
    meta: [
      { label: 'الحالة', value: view.isBalanced ? 'متوازن' : 'غير متوازن' },
      { label: 'إجمالي الأصول', value: formatAmount(view.assets.total) },
      { label: 'إجمالي الالتزامات', value: formatAmount(view.obligations.total) },
    ],
    columns: [
      { key: 'side', header: 'الجانب', width: '14%', bold: true },
      { key: 'label', header: 'البند', bold: true },
      { key: 'detail', header: 'التفاصيل' },
      { key: 'share', header: 'النسبة', align: 'center', width: '10%' },
      {
        key: 'amount',
        header: 'المبلغ',
        align: 'end',
        width: '22%',
        bold: true,
        format: (v) => formatAmount(Number(v)),
      },
    ],
    rows: [...sideRows(view.assets), ...sideRows(view.obligations)],
    totals: {
      label: 'الفرق (الأصول − الالتزامات)',
      labelColSpan: 4,
      cells: [formatAmount(view.difference)],
    },
  };
}

function sideRows(side: BalanceSideView): BalancePrintRow[] {
  return [
    ...side.lines.map<BalancePrintRow>((line) => ({
      side: side.title,
      label: line.label,
      detail: line.caption,
      share: formatPercent(line.share),
      amount: line.amount,
    })),
    {
      side: side.title,
      label: `إجمالي ${side.title}`,
      detail: '',
      share: '',
      amount: side.total,
    },
  ];
}
