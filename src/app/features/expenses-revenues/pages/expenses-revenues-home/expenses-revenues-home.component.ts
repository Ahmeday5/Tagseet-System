import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../core/constants/permissions.const';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';

import { TreasuryService } from '../../../treasury/services/treasury.service';
import { ExpensesService } from '../../services/expenses.service';
import { RevenuesService } from '../../services/revenues.service';
import { ExpenseDto } from '../../models/expense.model';
import { RevenueDto } from '../../models/revenue.model';
import { ExpenseFormModalComponent } from '../../components/expense-form-modal/expense-form-modal.component';
import { RevenueFormModalComponent } from '../../components/revenue-form-modal/revenue-form-modal.component';

const DEFAULT_PAGE_SIZE = 10;
const REFETCH_DEBOUNCE_MS = 250;

type Tab = 'expenses' | 'revenues';

@Component({
  selector: 'app-expenses-revenues-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PaginationComponent,
    SearchableSelectComponent,
    CurrencyArPipe,
    DateArPipe,
    HasPermissionDirective,
    ExpenseFormModalComponent,
    RevenueFormModalComponent,
  ],
  templateUrl: './expenses-revenues-home.component.html',
  styleUrl: './expenses-revenues-home.component.scss',
})
export class ExpensesRevenuesHomeComponent {
  private readonly expensesService = inject(ExpensesService);
  private readonly revenuesService = inject(RevenuesService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly toast = inject(ToastService);
  private readonly cache = inject(HttpCacheService);

  protected readonly PERMS = PERMISSIONS;

  // ── tabs ──
  protected readonly activeTab = signal<Tab>('expenses');

  // ── shared treasury lookup ──
  protected readonly treasuryOptions = signal<
    { value: number | string; label: string }[]
  >([]);

  // ── expenses state ──
  protected readonly expenses = signal<ExpenseDto[]>([]);
  protected readonly expensesLoading = signal(false);
  protected readonly expensesTotal = signal(0);
  protected readonly expensesTreasuryFilter = signal<number | ''>('');
  protected readonly expensesFrom = signal('');
  protected readonly expensesTo = signal('');
  protected readonly expensesPageIndex = signal(1);
  protected readonly expensesPageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly expensesCount = signal(0);
  protected readonly expensesTotalPages = signal(0);
  protected readonly expenseFormOpen = signal(false);

  // ── revenues state ──
  protected readonly revenues = signal<RevenueDto[]>([]);
  protected readonly revenuesLoading = signal(false);
  protected readonly revenuesTotal = signal(0);
  protected readonly revenuesTreasuryFilter = signal<number | ''>('');
  protected readonly revenuesFrom = signal('');
  protected readonly revenuesTo = signal('');
  protected readonly revenuesPageIndex = signal(1);
  protected readonly revenuesPageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly revenuesCount = signal(0);
  protected readonly revenuesTotalPages = signal(0);
  protected readonly revenueFormOpen = signal(false);

  protected readonly expensesHasFilters = computed(
    () => !!this.expensesTreasuryFilter() || !!this.expensesFrom() || !!this.expensesTo(),
  );
  protected readonly revenuesHasFilters = computed(
    () => !!this.revenuesTreasuryFilter() || !!this.revenuesFrom() || !!this.revenuesTo(),
  );

  private readonly expensesTrigger = computed(() => ({
    treasuryId: this.expensesTreasuryFilter(),
    from: this.expensesFrom(),
    to: this.expensesTo(),
    pageIndex: this.expensesPageIndex(),
    pageSize: this.expensesPageSize(),
  }));

  private readonly revenuesTrigger = computed(() => ({
    treasuryId: this.revenuesTreasuryFilter(),
    from: this.revenuesFrom(),
    to: this.revenuesTo(),
    pageIndex: this.revenuesPageIndex(),
    pageSize: this.revenuesPageSize(),
  }));

  private expensesDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private revenuesDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const trigger = this.expensesTrigger();
      if (this.expensesDebounceTimer) clearTimeout(this.expensesDebounceTimer);
      this.expensesDebounceTimer = setTimeout(
        () => this.fetchExpenses(trigger, false),
        REFETCH_DEBOUNCE_MS,
      );
    });

    effect(() => {
      const trigger = this.revenuesTrigger();
      if (this.revenuesDebounceTimer) clearTimeout(this.revenuesDebounceTimer);
      this.revenuesDebounceTimer = setTimeout(
        () => this.fetchRevenues(trigger, false),
        REFETCH_DEBOUNCE_MS,
      );
    });

    onInvalidate(this.cache, 'expenses', () => this.refreshExpenses());
    onInvalidate(this.cache, 'revenues', () => this.refreshRevenues());

    this.treasuryService.lookup().subscribe({
      next: (items) =>
        this.treasuryOptions.set(items.map((t) => ({ value: t.id, label: t.name }))),
      error: () => {},
    });
  }

  // ─────────── tabs ───────────

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  // ─────────── expenses ───────────

  private fetchExpenses(
    trigger: ReturnType<typeof this.expensesTrigger>,
    force: boolean,
  ): void {
    this.expensesLoading.set(true);
    const stream$ = force
      ? this.expensesService.refresh(trigger)
      : this.expensesService.list(trigger);

    stream$.subscribe({
      next: (res) => {
        this.expenses.set(res?.items?.data ?? []);
        this.expensesCount.set(res?.items?.count ?? 0);
        this.expensesTotalPages.set(res?.items?.totalPages ?? 0);
        this.expensesTotal.set(res?.summary?.totalExpenses ?? 0);
        this.expensesLoading.set(false);
      },
      error: (err: ApiError) => {
        this.expenses.set([]);
        this.expensesCount.set(0);
        this.expensesTotalPages.set(0);
        this.expensesLoading.set(false);
        this.toast.error(err?.message || 'تعذّر تحميل المصروفات');
      },
    });
  }

  protected refreshExpenses(): void {
    this.fetchExpenses(this.expensesTrigger(), true);
  }

  protected onExpensesTreasuryChange(value: number | string | null): void {
    this.expensesTreasuryFilter.set(value === null || value === '' ? '' : Number(value));
    this.resetExpensesPage();
  }

  protected onExpensesFromChange(value: string): void {
    this.expensesFrom.set(value);
    this.resetExpensesPage();
  }

  protected onExpensesToChange(value: string): void {
    this.expensesTo.set(value);
    this.resetExpensesPage();
  }

  protected clearExpensesFilters(): void {
    this.expensesTreasuryFilter.set('');
    this.expensesFrom.set('');
    this.expensesTo.set('');
    this.resetExpensesPage();
  }

  protected onExpensesPageChange(page: number): void {
    this.expensesPageIndex.set(page);
  }

  protected onExpensesPageSizeChange(size: number): void {
    this.expensesPageSize.set(size);
    this.resetExpensesPage();
  }

  private resetExpensesPage(): void {
    if (this.expensesPageIndex() !== 1) this.expensesPageIndex.set(1);
  }

  protected openExpenseForm(): void {
    this.expenseFormOpen.set(true);
  }

  protected closeExpenseForm(): void {
    this.expenseFormOpen.set(false);
  }

  protected onExpenseSaved(): void {
    this.expenseFormOpen.set(false);
    if (this.expensesPageIndex() !== 1) this.expensesPageIndex.set(1);
    else this.refreshExpenses();
  }

  // ─────────── revenues ───────────

  private fetchRevenues(
    trigger: ReturnType<typeof this.revenuesTrigger>,
    force: boolean,
  ): void {
    this.revenuesLoading.set(true);
    const stream$ = force
      ? this.revenuesService.refresh(trigger)
      : this.revenuesService.list(trigger);

    stream$.subscribe({
      next: (res) => {
        this.revenues.set(res?.items?.data ?? []);
        this.revenuesCount.set(res?.items?.count ?? 0);
        this.revenuesTotalPages.set(res?.items?.totalPages ?? 0);
        this.revenuesTotal.set(res?.summary?.totalRevenues ?? 0);
        this.revenuesLoading.set(false);
      },
      error: (err: ApiError) => {
        this.revenues.set([]);
        this.revenuesCount.set(0);
        this.revenuesTotalPages.set(0);
        this.revenuesLoading.set(false);
        this.toast.error(err?.message || 'تعذّر تحميل الإيرادات');
      },
    });
  }

  protected refreshRevenues(): void {
    this.fetchRevenues(this.revenuesTrigger(), true);
  }

  protected onRevenuesTreasuryChange(value: number | string | null): void {
    this.revenuesTreasuryFilter.set(value === null || value === '' ? '' : Number(value));
    this.resetRevenuesPage();
  }

  protected onRevenuesFromChange(value: string): void {
    this.revenuesFrom.set(value);
    this.resetRevenuesPage();
  }

  protected onRevenuesToChange(value: string): void {
    this.revenuesTo.set(value);
    this.resetRevenuesPage();
  }

  protected clearRevenuesFilters(): void {
    this.revenuesTreasuryFilter.set('');
    this.revenuesFrom.set('');
    this.revenuesTo.set('');
    this.resetRevenuesPage();
  }

  protected onRevenuesPageChange(page: number): void {
    this.revenuesPageIndex.set(page);
  }

  protected onRevenuesPageSizeChange(size: number): void {
    this.revenuesPageSize.set(size);
    this.resetRevenuesPage();
  }

  private resetRevenuesPage(): void {
    if (this.revenuesPageIndex() !== 1) this.revenuesPageIndex.set(1);
  }

  protected openRevenueForm(): void {
    this.revenueFormOpen.set(true);
  }

  protected closeRevenueForm(): void {
    this.revenueFormOpen.set(false);
  }

  protected onRevenueSaved(): void {
    this.revenueFormOpen.set(false);
    if (this.revenuesPageIndex() !== 1) this.revenuesPageIndex.set(1);
    else this.refreshRevenues();
  }
}
