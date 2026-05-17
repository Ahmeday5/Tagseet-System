import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  Treasury,
  TreasuryTransfer,
  TreasuryOperation,
  MonthlyProfit,
} from '../../models/treasury.model';
import { TreasuryService } from '../../services/treasury.service';
import { RepsService } from '../../../reps/services/reps.service';
import { RepresentativeSubTreasury } from '../../../reps/models/rep.model';
import { TreasuryFormModelComponent } from '../../components/treasury-form-model/treasury-form-model.component';
import { TreasuryTransferModalComponent } from '../../components/treasury-transfer-modal/treasury-transfer-modal.component';
import {
  BadgeComponent,
  BadgeType,
} from '../../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../core/constants/permissions.const';
import { FormMode } from '../../../../shared/models/form-mode.model';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';
import { ApiError } from '../../../../core/models/api-response.model';
import { TreasuryType } from '../../enums/treasury-type.enum';
import {
  TREASURY_TYPE_BADGE,
  TREASURY_TYPE_LABELS,
} from '../../constants/treasury-type-labels';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-treasury-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TreasuryFormModelComponent,
    TreasuryTransferModalComponent,
    BadgeComponent,
    PaginationComponent,
    CurrencyArPipe,
    DateArPipe,
    HasPermissionDirective,
    CommonModule,
  ],
  templateUrl: './treasury-home.component.html',
  styleUrl: './treasury-home.component.scss',
})
export class TreasuryHomeComponent implements OnInit {
  private readonly treasuryService = inject(TreasuryService);
  private readonly repsService = inject(RepsService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly cache = inject(HttpCacheService);

  /** Exposed so the template can gate write actions with `*appHasPermission`. */
  protected readonly PERMS = PERMISSIONS;

  // ── data ──
  protected readonly treasuries = signal<Treasury[]>([]);
  protected readonly loading = signal(false);

  // ── representatives' sub-treasuries ──
  protected readonly subTreasuries = signal<RepresentativeSubTreasury[]>([]);
  protected readonly subTreasuriesLoading = signal(false);

  // ── modal state ──
  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<FormMode>('create');
  protected readonly modalTreasury = signal<Treasury | null>(null);

  /** Tracks which row is currently being deleted, for inline button state. */
  protected readonly deletingId = signal<number | null>(null);

  // ── transfers state ──
  protected readonly transfers = signal<TreasuryTransfer[]>([]);
  protected readonly transfersLoading = signal(false);
  protected readonly transferModalOpen = signal(false);

  // transfer filters
  protected readonly tFromFilter = signal<number | ''>('');
  protected readonly tToFilter = signal<number | ''>('');
  protected readonly tFromDate = signal<string>('');
  protected readonly tToDate = signal<string>('');
  protected readonly tPageIndex = signal(1);
  protected readonly tPageSize = signal(10);

  // server pagination meta
  protected readonly tCount = signal(0);
  protected readonly tTotalPages = signal(0);

  // ── derived ──
  protected readonly hasTreasuries = computed(
    () => this.treasuries().length > 0,
  );

  /** Sum of `currentBalance` across every treasury — drives the hero number. */
  protected readonly totalBalance = computed(() =>
    this.treasuries().reduce((sum, t) => sum + (t.currentBalance ?? 0), 0),
  );

  /** Combined balance of all treasuries flagged as `Main`. */
  protected readonly mainBalance = computed(() =>
    this.treasuries()
      .filter((t) => t.type === TreasuryType.Main)
      .reduce((sum, t) => sum + (t.currentBalance ?? 0), 0),
  );

  /** Footer totals for the sub-treasuries table. */
  protected readonly subTreasuriesTotalBalance = computed(() =>
    this.subTreasuries().reduce((sum, s) => sum + (s.balance ?? 0), 0),
  );
  protected readonly subTreasuriesTotalCommission = computed(() =>
    this.subTreasuries().reduce(
      (sum, s) => sum + (s.accumulatedCommission ?? 0),
      0,
    ),
  );

  /** Combined trigger — any filter / page change refetches. */
  protected readonly transfersTrigger = computed(() => ({
    pageIndex: this.tPageIndex(),
    pageSize: this.tPageSize(),
    fromTreasuryId: this.tFromFilter(),
    toTreasuryId: this.tToFilter(),
    from: this.tFromDate(),
    to: this.tToDate(),
  }));

  protected readonly hasTransferFilters = computed(
    () =>
      !!this.tFromFilter() ||
      !!this.tToFilter() ||
      !!this.tFromDate() ||
      !!this.tToDate(),
  );

  /** Combined trigger — any filter / page change refetches. */
  protected readonly operationsTrigger = computed(() => ({
    pageIndex: this.oPageIndex(),
    pageSize: this.oPageSize(),
    treasuryId: this.oTreasuryFilter(),
    from: this.oFromDate(),
    to: this.oToDate(),
  }));

  protected readonly hasOperationFilters = computed(
    () => !!this.oTreasuryFilter() || !!this.oFromDate() || !!this.oToDate(),
  );

  /** Debounce handle for filter-driven transfer refetches. */
  private transfersDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ── operations state ──
  protected readonly operations = signal<TreasuryOperation[]>([]);
  protected readonly operationsLoading = signal(false);
  private operationsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // operations filters
  protected readonly oTreasuryFilter = signal<number | ''>('');
  protected readonly oFromDate = signal<string>('');
  protected readonly oToDate = signal<string>('');
  protected readonly oPageIndex = signal(1);
  protected readonly oPageSize = signal(10);

  // server pagination meta
  protected readonly oCount = signal(0);
  protected readonly oTotalPages = signal(0);

  // ── monthly profits state ──
  protected readonly monthlyProfits = signal<MonthlyProfit[]>([]);
  protected readonly monthlyProfitsLoading = signal(false);
  protected readonly selectedYear = signal<number | null>(null);
  private monthlyProfitsDebounceTimer: ReturnType<typeof setTimeout> | null =
    null;

  constructor() {
    // Auto-refresh whenever a treasury-related cache key is invalidated
    // anywhere (this tab or another via BroadcastChannel) — e.g. after
    // a treasury transfer was just created from this tab.
    onInvalidate(this.cache, 'treasur', () => {
      this.refresh();
      this.fetchTransfers(this.transfersTrigger(), true);
      this.fetchOperations(this.operationsTrigger(), true);
      this.fetchMonthlyProfits(this.selectedYear(), true);
      this.loadSubTreasuries(true);
    });

    // Refetch transfers on any filter / page change. The fetch is wrapped
    // in `setTimeout` so signal writes inside it run OUTSIDE the effect's
    // reactive context — matches the codebase idiom (see customers-list).
    effect(() => {
      const trigger = this.transfersTrigger();
      if (this.transfersDebounceTimer) {
        clearTimeout(this.transfersDebounceTimer);
      }
      this.transfersDebounceTimer = setTimeout(
        () => this.fetchTransfers(trigger, false),
        200,
      );
    });

    // Refetch operations on any filter / page change.
    effect(() => {
      const trigger = this.operationsTrigger();
      if (this.operationsDebounceTimer) {
        clearTimeout(this.operationsDebounceTimer);
      }
      this.operationsDebounceTimer = setTimeout(
        () => this.fetchOperations(trigger, false),
        200,
      );
    });

    // Refetch monthly profits on year change.
    effect(() => {
      const year = this.selectedYear();
      if (this.monthlyProfitsDebounceTimer) {
        clearTimeout(this.monthlyProfitsDebounceTimer);
      }
      this.monthlyProfitsDebounceTimer = setTimeout(
        () => this.fetchMonthlyProfits(year, false),
        200,
      );
    });
  }

  ngOnInit(): void {
    this.loadTreasuries();
    this.loadSubTreasuries(false);
    this.loadOperations();
    this.loadMonthlyProfits();
  }

  // ─────────────── sub-treasuries ───────────────

  protected loadSubTreasuries(force: boolean): void {
    this.subTreasuriesLoading.set(true);
    const stream$ = force
      ? this.repsService.refreshSubTreasuries()
      : this.repsService.subTreasuries();
    stream$.subscribe({
      next: (list) => {
        this.subTreasuries.set(list ?? []);
        this.subTreasuriesLoading.set(false);
      },
      error: () => {
        this.subTreasuries.set([]);
        this.subTreasuriesLoading.set(false);
      },
    });
  }

  // ─────────────── data loading ───────────────

  protected loadTreasuries(): void {
    this.fetch(false);
  }

  /**
   * Force-refresh from the server, bypassing the cache. Used after
   * any mutation so the local list — and the cached entry that survives
   * F5 — both reflect the canonical server state.
   */
  protected refresh(): void {
    this.fetch(true);
  }

  private fetch(force: boolean): void {
    this.loading.set(true);
    const stream$ = force
      ? this.treasuryService.refreshList()
      : this.treasuryService.list();
    stream$.subscribe({
      next: (list) => {
        this.treasuries.set(list ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ─────────────── modal handlers ───────────────

  protected openCreate(): void {
    this.modalTreasury.set(null);
    this.modalMode.set('create');
    this.modalOpen.set(true);
  }

  protected openEdit(treasury: Treasury): void {
    this.modalTreasury.set(treasury);
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected onSaved(_saved: Treasury): void {
    this.modalOpen.set(false);
    // Always re-fetch from server (bypassing cache) instead of an
    // optimistic local insert. The cached entry — which survives F5
    // via localStorage — gets replaced with the fresh list, so the
    // newly-saved treasury stays visible on hard refresh.
    this.refresh();
  }

  // ─────────────── delete ───────────────

  protected async confirmDelete(treasury: Treasury): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'حذف خزينة',
      message: `هل أنت متأكد من حذف "${treasury.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (!ok) return;

    this.deletingId.set(treasury.id);
    this.treasuryService.delete(treasury.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toast.success('تم حذف الخزينة بنجاح');
        // Re-fetch from server (bypassing cache) so subsequent reads
        // — including hard-refreshes — see the canonical list.
        this.refresh();
      },
      error: (_err: ApiError) => this.deletingId.set(null),
    });
  }

  // ─────────────── view helpers ───────────────

  protected typeLabel(type: TreasuryType): string {
    return TREASURY_TYPE_LABELS[type] ?? type;
  }

  protected typeBadge(type: TreasuryType): BadgeType {
    return TREASURY_TYPE_BADGE[type] ?? 'info';
  }

  // ─────────────── transfers ───────────────

  private fetchTransfers(
    trigger: ReturnType<typeof this.transfersTrigger>,
    force: boolean,
  ): void {
    this.transfersLoading.set(true);
    const stream$ = force
      ? this.treasuryService.refreshTransfers(trigger)
      : this.treasuryService.listTransfers(trigger);

    stream$.subscribe({
      next: (page) => {
        this.transfers.set(page?.data ?? []);
        this.tCount.set(page?.count ?? 0);
        this.tTotalPages.set(page?.totalPages ?? 0);
        this.transfersLoading.set(false);
      },
      error: () => {
        this.transfers.set([]);
        this.tCount.set(0);
        this.tTotalPages.set(0);
        this.transfersLoading.set(false);
      },
    });
  }

  protected refreshTransfers(): void {
    this.fetchTransfers(this.transfersTrigger(), true);
  }

  // transfer filter handlers
  protected onTransferFromChange(value: string): void {
    this.tFromFilter.set(value === '' ? '' : Number(value));
    this.resetTransfersPage();
  }

  protected onTransferToChange(value: string): void {
    this.tToFilter.set(value === '' ? '' : Number(value));
    this.resetTransfersPage();
  }

  protected onTransferFromDate(value: string): void {
    this.tFromDate.set(value);
    this.resetTransfersPage();
  }

  protected onTransferToDate(value: string): void {
    this.tToDate.set(value);
    this.resetTransfersPage();
  }

  protected clearTransferFilters(): void {
    this.tFromFilter.set('');
    this.tToFilter.set('');
    this.tFromDate.set('');
    this.tToDate.set('');
    this.resetTransfersPage();
  }

  protected onTransfersPageChange(page: number): void {
    this.tPageIndex.set(page);
  }

  protected onTransfersPageSizeChange(size: number): void {
    this.tPageSize.set(size);
    this.resetTransfersPage();
  }

  private resetTransfersPage(): void {
    if (this.tPageIndex() !== 1) this.tPageIndex.set(1);
  }

  // transfer modal handlers
  protected openTransfer(): void {
    this.transferModalOpen.set(true);
  }

  protected closeTransfer(): void {
    this.transferModalOpen.set(false);
  }

  protected onTransferSaved(_: TreasuryTransfer): void {
    this.transferModalOpen.set(false);
    // Cache invalidation in the service already triggers `onInvalidate`,
    // which re-fetches treasuries AND transfers — no manual refresh needed.
  }

  // ─────────────── operations ───────────────

  protected loadOperations(): void {
    this.fetchOperations(this.operationsTrigger(), false);
  }

  private fetchOperations(
    trigger: ReturnType<typeof this.operationsTrigger>,
    force: boolean,
  ): void {
    this.operationsLoading.set(true);
    const stream$ = force
      ? this.treasuryService.refreshOperations(trigger)
      : this.treasuryService.listOperations(trigger);

    stream$.subscribe({
      next: (page) => {
        this.operations.set(page?.data ?? []);
        this.oCount.set(page?.count ?? 0);
        this.oTotalPages.set(page?.totalPages ?? 0);
        this.operationsLoading.set(false);
      },
      error: () => {
        this.operations.set([]);
        this.oCount.set(0);
        this.oTotalPages.set(0);
        this.operationsLoading.set(false);
      },
    });
  }

  protected refreshOperations(): void {
    this.fetchOperations(this.operationsTrigger(), true);
  }

  // operations filter handlers
  protected onOperationsTreasuryChange(value: string): void {
    this.oTreasuryFilter.set(value === '' ? '' : Number(value));
    this.resetOperationsPage();
  }

  protected onOperationsFromDate(value: string): void {
    this.oFromDate.set(value);
    this.resetOperationsPage();
  }

  protected onOperationsToDate(value: string): void {
    this.oToDate.set(value);
    this.resetOperationsPage();
  }

  protected clearOperationFilters(): void {
    this.oTreasuryFilter.set('');
    this.oFromDate.set('');
    this.oToDate.set('');
    this.resetOperationsPage();
  }

  protected onOperationsPageChange(page: number): void {
    this.oPageIndex.set(page);
  }

  protected onOperationsPageSizeChange(size: number): void {
    this.oPageSize.set(size);
    this.resetOperationsPage();
  }

  private resetOperationsPage(): void {
    if (this.oPageIndex() !== 1) this.oPageIndex.set(1);
  }

  // operations view helpers
  protected directionBadge(direction: string): BadgeType {
    return direction === 'Receipt' ? 'ok' : 'bad';
  }

  protected directionLabel(direction: string): string {
    return direction === 'Receipt' ? 'إيراد' : 'صرف';
  }

  protected signedAmountClass(signedAmount: number): string {
    return signedAmount >= 0 ? 'trf-amount-positive' : 'trf-amount-negative';
  }

  // ─────────────── monthly profits ───────────────

  protected loadMonthlyProfits(): void {
    this.fetchMonthlyProfits(null, false);
  }

  private fetchMonthlyProfits(year: number | null, force: boolean): void {
    this.monthlyProfitsLoading.set(true);
    const stream$ = force
      ? this.treasuryService.refreshMonthlyProfits(year ?? undefined)
      : this.treasuryService.listMonthlyProfits(year ?? undefined);

    stream$.subscribe({
      next: (data) => {
        this.monthlyProfits.set(data ?? []);
        this.monthlyProfitsLoading.set(false);
      },
      error: () => {
        this.monthlyProfits.set([]);
        this.monthlyProfitsLoading.set(false);
      },
    });
  }

  protected refreshMonthlyProfits(): void {
    this.fetchMonthlyProfits(this.selectedYear(), true);
  }

  protected onYearChange(value: string): void {
    this.selectedYear.set(value === '' ? null : Number(value));
  }

  protected profitClass(profit: number): string {
    return profit > 0
      ? 'mp-positive'
      : profit < 0
        ? 'mp-negative'
        : 'mp-neutral';
  }

  protected marginClass(margin: number): string {
    if (margin >= 30) return 'mp-margin-excellent';
    if (margin >= 20) return 'mp-margin-good';
    if (margin >= 10) return 'mp-margin-fair';
    return 'mp-margin-low';
  }

  protected monthRowClass(isCurrentMonth: boolean): string {
    return isCurrentMonth ? 'mp-current-month' : '';
  }
}
