import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { PrintService } from '../../../../core/services/print.service';
import { ToastService } from '../../../../core/services/toast.service';
import { fetchAllPages } from '../../../../core/utils/api-list.util';

import { SubAccountsService } from '../../services/sub-accounts.service';
import { SubAccountTransfer } from '../../models/sub-account.model';

const DEFAULT_PAGE_SIZE = 10;
const REFETCH_DEBOUNCE_MS = 250;

/**
 * The full transfer log between sub-accounts, with a from-account filter,
 * a to-account filter and a date range. Read-only reporting surface —
 * creation happens from `app-sub-account-transfer-modal`.
 *
 * The account dropdowns can be pre-seeded via [accounts] so they don't
 * refetch; if omitted, the modal drains the account list itself on first open.
 */
@Component({
  selector: 'app-sub-account-transfers-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ModalComponent,
    PaginationComponent,
    SearchableSelectComponent,
    CurrencyArPipe,
    DateArPipe,
  ],
  templateUrl: './sub-account-transfers-modal.component.html',
  styleUrl: './sub-account-transfers-modal.component.scss',
})
export class SubAccountTransfersModalComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();
  /** Pre-seeded account options for the filters — `{ value, label, hint }`. */
  readonly accounts = input<SearchableSelectOption[]>([]);

  // ── outputs ──
  readonly closed = output<void>();

  // ── deps ──
  private readonly service = inject(SubAccountsService);
  private readonly printer = inject(PrintService);
  private readonly toast = inject(ToastService);

  // ── data ──
  protected readonly transfers = signal<SubAccountTransfer[]>([]);
  protected readonly loading = signal(false);
  protected readonly isPrinting = signal(false);
  protected readonly accountOptions = signal<SearchableSelectOption[]>([]);

  // ── filters ──
  protected readonly fromSubAccountId = signal<number | ''>('');
  protected readonly toSubAccountId = signal<number | ''>('');
  protected readonly fromDate = signal<string>('');
  protected readonly toDate = signal<string>('');
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  // ── server pagination meta ──
  protected readonly count = signal(0);
  protected readonly totalPages = signal(0);

  // ── derived ──
  protected readonly hasFilters = computed(
    () =>
      !!this.fromSubAccountId() ||
      !!this.toSubAccountId() ||
      !!this.fromDate() ||
      !!this.toDate(),
  );

  protected readonly pageTotal = computed(() =>
    this.transfers().reduce((s, t) => s + (t.amount ?? 0), 0),
  );

  private readonly trigger = computed(() => ({
    fromSubAccountId: this.fromSubAccountId(),
    toSubAccountId: this.toSubAccountId(),
    from: this.fromDate(),
    to: this.toDate(),
    pageIndex: this.pageIndex(),
    pageSize: this.pageSize(),
  }));

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Refetch on open + on any filter / page change (debounced). The fetch is
    // deferred so its signal writes run outside this effect's reactive context.
    effect(() => {
      if (!this.open()) return;
      const trigger = this.trigger();
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(
        () => this.fetch(trigger, false),
        REFETCH_DEBOUNCE_MS,
      );
    });

    // Mirror seeded accounts into the local option signal, and drain the full
    // list the first time the modal opens if nothing was provided.
    effect(
      () => {
        const seeded = this.accounts();
        if (seeded.length) this.accountOptions.set(seeded);
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        if (this.open() && this.accountOptions().length === 0) {
          this.loadAccounts();
        }
      },
      { allowSignalWrites: true },
    );
  }

  // ─────────── template handlers ───────────

  protected close(): void {
    this.closed.emit();
  }

  protected refresh(): void {
    this.fetch(this.trigger(), true);
  }

  protected onFromAccountChange(value: number | string | null): void {
    this.fromSubAccountId.set(value === null || value === '' ? '' : Number(value));
    this.resetPage();
  }

  protected onToAccountChange(value: number | string | null): void {
    this.toSubAccountId.set(value === null || value === '' ? '' : Number(value));
    this.resetPage();
  }

  protected onFromDateChange(value: string): void {
    this.fromDate.set(value);
    this.resetPage();
  }

  protected onToDateChange(value: string): void {
    this.toDate.set(value);
    this.resetPage();
  }

  protected clearFilters(): void {
    this.fromSubAccountId.set('');
    this.toSubAccountId.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.resetPage();
  }

  protected onPageChange(page: number): void {
    this.pageIndex.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.resetPage();
  }

  private resetPage(): void {
    if (this.pageIndex() !== 1) this.pageIndex.set(1);
  }

  /** Exports every transfer matching the active filters to a PDF. */
  protected print(): void {
    if (this.isPrinting()) return;
    this.isPrinting.set(true);
    const { fromSubAccountId, toSubAccountId, from, to } = this.trigger();

    fetchAllPages<SubAccountTransfer>((pageIndex, pageSize) =>
      this.service.refreshTransfers({
        fromSubAccountId,
        toSubAccountId,
        from,
        to,
        pageIndex,
        pageSize,
      }),
    ).subscribe({
      next: (rows) => {
        this.isPrinting.set(false);
        const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
        const meta: Array<{ label: string; value: string }> = [];
        if (fromSubAccountId) {
          const opt = this.accountOptions().find(
            (o) => String(o.value) === String(fromSubAccountId),
          );
          if (opt) meta.push({ label: 'من حساب', value: opt.label });
        }
        if (toSubAccountId) {
          const opt = this.accountOptions().find(
            (o) => String(o.value) === String(toSubAccountId),
          );
          if (opt) meta.push({ label: 'إلى حساب', value: opt.label });
        }
        if (from) meta.push({ label: 'من تاريخ', value: from });
        if (to) meta.push({ label: 'إلى تاريخ', value: to });

        this.printer.print<SubAccountTransfer>({
          title: 'سجل التحويلات بين الحسابات الفرعية',
          subtitle: 'كل التحويلات المسجلة بين الحسابات الفرعية',
          meta,
          orientation: 'landscape',
          columns: [
            { key: 'transferDate', header: 'التاريخ', align: 'center', format: 'shortDate' },
            { key: 'fromSubAccountName', header: 'من حساب', align: 'start', bold: true },
            { key: 'toSubAccountName', header: 'إلى حساب', align: 'start', bold: true },
            { key: 'amount', header: 'المبلغ', align: 'end', format: 'currency', bold: true },
            { key: 'notes', header: 'ملاحظات', align: 'start' },
          ],
          totals: {
            label: 'إجمالي المبالغ',
            labelColSpan: 3,
            cells: [`${Math.round(total).toLocaleString('ar-EG')} ج.م`, ''],
          },
          rows,
        });
      },
      error: () => {
        this.isPrinting.set(false);
        this.toast.error('تعذر تجهيز ملف الطباعة');
      },
    });
  }

  // ─────────── internals ───────────

  private loadAccounts(): void {
    fetchAllPages((pageIndex, pageSize) =>
      this.service.list({ pageIndex, pageSize }),
    ).subscribe({
      next: (rows) =>
        this.accountOptions.set(
          rows.map((a) => ({
            value: a.id,
            label: a.name,
            hint: a.phoneNumber,
          })),
        ),
      error: () => this.accountOptions.set([]),
    });
  }

  private fetch(
    trigger: ReturnType<typeof this.trigger>,
    force: boolean,
  ): void {
    this.loading.set(true);
    const stream$ = force
      ? this.service.refreshTransfers(trigger)
      : this.service.listTransfers(trigger);

    stream$.subscribe({
      next: (page) => {
        this.transfers.set(page?.data ?? []);
        this.count.set(page?.count ?? 0);
        this.totalPages.set(page?.totalPages ?? 0);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.transfers.set([]);
        this.count.set(0);
        this.totalPages.set(0);
        this.loading.set(false);
        this.toast.error(err?.message || 'تعذّر تحميل التحويلات');
      },
    });
  }
}
