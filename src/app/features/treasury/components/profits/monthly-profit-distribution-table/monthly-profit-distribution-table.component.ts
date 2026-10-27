import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AmountArPipe } from '../../../../../shared/pipes/amount-ar.pipe';
import {
  MonthlyProfitDistribution,
  MonthlyTable,
  RepresentativeProfit,
} from '../../../models/treasury.model';
import { PROFITS_HINTS } from '../../../constants/profits-hints.const';

interface DistributionViewRow {
  row: MonthlyProfitDistribution;
  /** Aligned 1:1 with the `representatives` columns. */
  repAmounts: number[];
}

/**
 * "توزيع الأرباح الشهرية". Representative columns are dynamic: headers come
 * from `representatives` (treasuries order) and each cell is matched by id —
 * never by index — since a month only lists reps that earned something.
 */
@Component({
  selector: 'app-monthly-profit-distribution-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountArPipe, NgTemplateOutlet],
  templateUrl: './monthly-profit-distribution-table.component.html',
  styleUrl: './monthly-profit-distribution-table.component.scss',
})
export class MonthlyProfitDistributionTableComponent {
  readonly table = input.required<MonthlyTable<MonthlyProfitDistribution>>();
  readonly representatives = input.required<RepresentativeProfit[]>();
  /** False when scoped to a single representative — company share is always 0 then. */
  readonly showCompanyFigures = input(true);

  protected readonly hints = PROFITS_HINTS;

  protected readonly months = computed(() =>
    this.table().months.map((row) => this.toViewRow(row)),
  );

  protected readonly total = computed(() => this.toViewRow(this.table().total));

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
