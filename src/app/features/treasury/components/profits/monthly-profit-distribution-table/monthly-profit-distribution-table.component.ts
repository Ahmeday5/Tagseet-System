import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AmountArPipe } from '../../../../../shared/pipes/amount-ar.pipe';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import {
  MonthlyProfitDistribution,
  MonthlyTable,
  RepresentativeProfit,
} from '../../../models/treasury.model';
import { PROFITS_HINTS } from '../../../constants/profits-hints.const';
import { ProfitInfoComponent } from '../profit-info/profit-info.component';
import { ProfitMonthDetailsComponent } from '../profit-month-details/profit-month-details.component';

type DistributionFigure =
  | 'netProfit'
  | 'representativesProfit'
  | 'shareholdersPool'
  | 'companyProfit'
  | 'shareholdersProfit'
  | 'distributedProfit';

interface DistributionColumn {
  key: DistributionFigure;
  label: string;
  hint: string;
  /** Hidden when scoped to a single representative (always 0 then). */
  companyOnly?: boolean;
  strong?: boolean;
}

const COLUMNS: readonly DistributionColumn[] = [
  { key: 'netProfit', label: 'صافي الربح', hint: PROFITS_HINTS.distributionNetProfit, strong: true },
  { key: 'representativesProfit', label: 'أرباح المناديب', hint: PROFITS_HINTS.representativesProfit },
  {
    key: 'shareholdersPool',
    label: 'ربح المساهمين قبل نسبة الشركة',
    hint: PROFITS_HINTS.shareholdersPool,
    companyOnly: true,
  },
  { key: 'companyProfit', label: 'أرباح الشركة', hint: PROFITS_HINTS.companyProfit, companyOnly: true },
  {
    key: 'shareholdersProfit',
    label: 'أرباح المساهمين',
    hint: PROFITS_HINTS.shareholdersProfit,
    companyOnly: true,
  },
  { key: 'distributedProfit', label: 'الأرباح الموزعة', hint: PROFITS_HINTS.distributedProfit, strong: true },
];

/** Half a cent — anything below is rounding noise. */
const TOLERANCE = 0.005;

interface DistributionViewRow {
  row: MonthlyProfitDistribution;
  /** Aligned 1:1 with the `representatives` columns. */
  repAmounts: number[];
}

/**
 * "توزيع الأرباح الشهرية". Representative columns are dynamic: headers come
 * from `representatives` (treasuries order) and each cell is matched by id —
 * never by index — since a month only lists reps that earned something.
 *
 * Every row (and the yearly total) opens a breakdown of how its net profit
 * was split.
 */
@Component({
  selector: 'app-monthly-profit-distribution-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AmountArPipe,
    NgTemplateOutlet,
    ModalComponent,
    ProfitInfoComponent,
    ProfitMonthDetailsComponent,
  ],
  templateUrl: './monthly-profit-distribution-table.component.html',
  styleUrl: './monthly-profit-distribution-table.component.scss',
})
export class MonthlyProfitDistributionTableComponent {
  readonly table = input.required<MonthlyTable<MonthlyProfitDistribution>>();
  readonly representatives = input.required<RepresentativeProfit[]>();
  /** False when scoped to a single representative — company/shareholder figures are 0 then. */
  readonly showCompanyFigures = input(true);
  /** `monthlySalesProfits.total.netProfit` — the yearly distribution must add up to it. */
  readonly expectedNetProfit = input.required<number>();

  protected readonly hints = PROFITS_HINTS;
  protected readonly selected = signal<MonthlyProfitDistribution | null>(null);

  protected readonly columns = computed(() =>
    this.showCompanyFigures() ? COLUMNS : COLUMNS.filter((c) => !c.companyOnly),
  );

  protected readonly months = computed(() =>
    this.table().months.map((row) => this.toViewRow(row)),
  );

  protected readonly total = computed(() => this.toViewRow(this.table().total));

  /** Company-wide only: a representative's slice never equals the full net profit. */
  protected readonly balanced = computed(
    () =>
      Math.abs(this.table().total.distributedProfit - this.expectedNetProfit()) < TOLERANCE,
  );

  protected readonly detailsTitle = computed(() => {
    const row = this.selected();
    if (!row) return '';
    return row === this.table().total
      ? 'تفاصيل توزيع أرباح العام'
      : `تفاصيل توزيع أرباح شهر ${row.monthName}`;
  });

  protected field(key: DistributionFigure): string {
    return `MonthlyProfitDistribution.${key}`;
  }

  private toViewRow(row: MonthlyProfitDistribution): DistributionViewRow {
    const byId = new Map(
      (row.representatives ?? []).map((r) => [r.representativeId, r.amount]),
    );
    return {
      row,
      repAmounts: this.representatives().map((rep) => byId.get(rep.representativeId) ?? 0),
    };
  }
}
