import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { normalizeArabic } from '../../../../core/utils/arabic-search.util';
import { BalanceEntriesSpec, BalanceEntry } from '../../models/balance-view.model';
import { BalanceAmountPipe } from '../../pipes/balance-amount.pipe';
import { BalanceCountPipe } from '../../pipes/balance-count.pipe';
import { isZeroAmount } from '../../utils/balance-format.util';

type SortKey = 'amount' | 'name';
type SortDir = 'asc' | 'desc';

interface IndexedEntry {
  readonly entry: BalanceEntry;
  readonly haystack: string;
}

const NAME_COLLATOR = new Intl.Collator('ar');

/**
 * Searchable, sortable breakdown of one balance line (treasuries,
 * shareholders …). Zero rows are hidden by default — on this data set they
 * are the majority and bury the accounts that actually carry a balance.
 */
@Component({
  selector: 'app-balance-entries-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, BalanceAmountPipe, BalanceCountPipe],
  templateUrl: './balance-entries-table.component.html',
  styleUrl: './balance-entries-table.component.scss',
})
export class BalanceEntriesTableComponent {
  readonly spec = input.required<BalanceEntriesSpec>();

  protected readonly query = signal('');
  protected readonly hideZero = signal(true);
  protected readonly sortKey = signal<SortKey>('amount');
  protected readonly sortDir = signal<SortDir>('desc');

  private readonly indexed = computed<readonly IndexedEntry[]>(() =>
    this.spec().rows.map((entry) => ({
      entry,
      haystack: normalizeArabic(`${entry.name} ${entry.id}`),
    })),
  );

  protected readonly hasMeta = computed(() => !!this.spec().metaHeader);

  protected readonly zeroCount = computed(
    () => this.spec().rows.filter((r) => isZeroAmount(r.amount)).length,
  );

  protected readonly rows = computed<readonly BalanceEntry[]>(() => {
    const term = normalizeArabic(this.query());
    const hideZero = this.hideZero();
    const key = this.sortKey();
    const factor = this.sortDir() === 'asc' ? 1 : -1;

    return this.indexed()
      .filter(({ entry, haystack }) =>
        (!hideZero || !isZeroAmount(entry.amount)) &&
        (!term || haystack.includes(term)),
      )
      .map(({ entry }) => entry)
      .sort((a, b) =>
        key === 'name'
          ? factor * NAME_COLLATOR.compare(a.name, b.name)
          : factor * (a.amount - b.amount) || NAME_COLLATOR.compare(a.name, b.name),
      );
  });

  protected readonly visibleTotal = computed(() =>
    this.rows().reduce((sum, r) => sum + r.amount, 0),
  );

  protected readonly isFiltered = computed(
    () => this.rows().length !== this.spec().rows.length,
  );

  protected readonly colspan = computed(() => (this.hasMeta() ? 4 : 3));

  protected onSearch(value: string): void {
    this.query.set(value);
  }

  protected toggleZero(): void {
    this.hideZero.update((v) => !v);
  }

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(key);
    // Amounts read best largest-first; names alphabetically.
    this.sortDir.set(key === 'amount' ? 'desc' : 'asc');
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  protected amountClass(amount: number): string {
    if (isZeroAmount(amount)) return 'bet-zero';
    return amount < 0 ? 'bet-neg' : '';
  }
}
