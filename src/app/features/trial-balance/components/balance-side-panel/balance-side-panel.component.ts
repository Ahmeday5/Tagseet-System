import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { NavIconComponent } from '../../../../shared/components/nav-icon/nav-icon.component';
import { BalanceLineKey, BalanceSideView } from '../../models/balance-view.model';
import { BalanceAmountPipe } from '../../pipes/balance-amount.pipe';
import { BalanceCountPipe } from '../../pipes/balance-count.pipe';
import { formatPercent, isZeroAmount } from '../../utils/balance-format.util';
import { BalanceEntriesTableComponent } from '../balance-entries-table/balance-entries-table.component';
import { ProfitBreakdownComponent } from '../profit-breakdown/profit-breakdown.component';

/** One accent per line — shared by the composition bar and the line's dot. */
const LINE_COLORS: Readonly<Record<BalanceLineKey, string>> = {
  treasuries: 'var(--bl)',
  receivables: 'var(--te)',
  inventory: 'var(--am)',
  subAccounts: 'var(--pu)',
  shareholders: 'var(--bl-d)',
  profit: 'var(--gr)',
  suppliers: 'var(--pi)',
};

/**
 * One side of the trial balance (assets or obligations): headline total,
 * a composition bar, and an accordion of its lines with drill-down detail.
 */
@Component({
  selector: 'app-balance-side-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NavIconComponent,
    BalanceAmountPipe,
    BalanceCountPipe,
    BalanceEntriesTableComponent,
    ProfitBreakdownComponent,
  ],
  templateUrl: './balance-side-panel.component.html',
  styleUrl: './balance-side-panel.component.scss',
})
export class BalanceSidePanelComponent {
  readonly side = input.required<BalanceSideView>();

  private readonly expanded = signal<ReadonlySet<BalanceLineKey>>(new Set());

  protected isExpanded(key: BalanceLineKey): boolean {
    return this.expanded().has(key);
  }

  protected toggle(key: BalanceLineKey): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  protected color(key: BalanceLineKey): string {
    return LINE_COLORS[key];
  }

  protected shareText(share: number): string {
    return formatPercent(share);
  }

  protected isZero(amount: number): boolean {
    return isZeroAmount(amount);
  }

  /** Safe average for the receivables drill-down. */
  protected average(amount: number, count: number): number {
    return count > 0 ? amount / count : 0;
  }
}
