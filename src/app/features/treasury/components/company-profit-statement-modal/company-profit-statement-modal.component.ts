import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { VoucherArPipe } from '../../../../shared/pipes/voucher-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

import { AmountArPipe } from '../../../../shared/pipes/amount-ar.pipe';
import { environment } from '../../../../../environments/environment';

import { ShareholdersService } from '../../services/shareholders.service';
import {
  CompanyProfitEntry,
  CompanyProfitStatement,
  CompanyProfitStatementQuery,
} from '../../models/company-profit-statement.model';
import { CompanyBalanceTransactionDto } from '../../models/shareholder.model';
import { toCompanyProfitEntryRow } from '../../constants/company-profit-labels';
import { periodTitle } from '../../constants/period-title.util';
import { CompanyBalanceModalComponent } from '../company-balance-modal/company-balance-modal.component';

const DEFAULT_PAGE_SIZE = 10;

/** Half a piaster — anything smaller is floating-point/rounding noise, not a real gap. */
const DIFFERENCE_TOLERANCE = 0.005;

@Component({
  selector: 'app-company-profit-statement-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ModalComponent,
    PaginationComponent,
    BadgeComponent,
    CurrencyArPipe,
    AmountArPipe,
    DateArPipe,
    VoucherArPipe,
    CompanyBalanceModalComponent,
  ],
  templateUrl: './company-profit-statement-modal.component.html',
  styleUrl: './company-profit-statement-modal.component.scss',
})
export class CompanyProfitStatementModalComponent {
  readonly open = input.required<boolean>();
  readonly closed = output<void>();
  /** Raised after an edit/delete so the parent can refresh the summary. */
  readonly changed = output<void>();

  private readonly service = inject(ShareholdersService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);

  protected readonly statement = signal<CompanyProfitStatement | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // ── date filters ──
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  /** The dates the currently-shown totals were computed for (applied, not draft). */
  protected readonly appliedFrom = signal('');
  protected readonly appliedTo = signal('');

  // ── pagination ──
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly count = signal(0);
  protected readonly totalPages = signal(0);

  // ── edit/delete ──
  protected readonly editOpen = signal(false);
  protected readonly editingTx = signal<CompanyBalanceTransactionDto | null>(null);
  protected readonly deletingId = signal<number | null>(null);

  // ── derived ──
  protected readonly currency = environment.currency;

  protected readonly rows = computed(() =>
    (this.statement()?.entries.data ?? []).map(toCompanyProfitEntryRow),
  );

  /** Non-null only when the backend reports a balance gap worth surfacing. */
  protected readonly unexplainedDifference = computed(() => {
    const diff = this.statement()?.unexplainedDifference ?? 0;
    return Math.abs(diff) >= DIFFERENCE_TOLERANCE ? diff : null;
  });

  protected readonly hasFilters = computed(
    () => !!this.fromDate() || !!this.toDate(),
  );

  /** Net-balance card title — reflects the period the totals actually cover. */
  protected readonly netBalanceTitle = computed(() =>
    periodTitle('صافي الرصيد', this.appliedFrom(), this.appliedTo()),
  );

  constructor() {
    // Fresh on every open: the company balance moves with every booked
    // profit, not only with writes made from this screen.
    effect(
      () => {
        if (!this.open()) return;
        untracked(() => this.fetch(this.pageIndex(), this.pageSize(), true));
      },
      { allowSignalWrites: true },
    );
  }

  protected close(): void {
    this.closed.emit();
  }

  protected refresh(): void {
    this.fetch(this.pageIndex(), this.pageSize(), true);
  }

  protected applyDates(): void {
    this.pageIndex.set(1);
    this.fetch(1, this.pageSize(), true);
  }

  protected clearDates(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.pageIndex.set(1);
    this.fetch(1, this.pageSize(), true);
  }

  protected onPageChange(page: number): void {
    this.pageIndex.set(page);
    this.fetch(page, this.pageSize(), false);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
    this.fetch(1, size, false);
  }

  // ─────────── edit / delete (manual deposit/withdrawal rows only) ───────────

  protected openEdit(entry: CompanyProfitEntry): void {
    if (!entry.isEditable) return;
    this.editingTx.set(this.toEditableDto(entry));
    this.editOpen.set(true);
  }

  protected onEditClosed(): void {
    this.editOpen.set(false);
    this.editingTx.set(null);
  }

  protected onEditSaved(): void {
    this.editOpen.set(false);
    this.editingTx.set(null);
    this.fetch(this.pageIndex(), this.pageSize(), true);
    this.changed.emit();
  }

  protected async confirmDelete(entry: CompanyProfitEntry): Promise<void> {
    if (!entry.isEditable) return;
    const ok = await this.dialog.confirm({
      title: 'حذف عملية رصيد الشركة',
      message: `هل أنت متأكد من حذف هذه العملية بمبلغ ${entry.amount}؟ سيُعكس أثرها على رصيد الشركة وعلى الخزينة. لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (!ok) return;

    this.deletingId.set(entry.id);
    this.service.deleteCompanyBalanceTransaction(entry.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toast.success('تم حذف عملية رصيد الشركة بنجاح');
        if (this.rows().length === 1 && this.pageIndex() > 1) {
          this.pageIndex.update((p) => p - 1);
        }
        this.fetch(this.pageIndex(), this.pageSize(), true);
        this.changed.emit();
      },
      error: (err: ApiError) => {
        this.deletingId.set(null);
        this.toast.error(apiErrorToMessage(err, 'تعذّر حذف عملية رصيد الشركة'));
      },
    });
  }

  /** Projects a statement row onto the shape the company-balance modal edits. */
  private toEditableDto(e: CompanyProfitEntry): CompanyBalanceTransactionDto {
    return {
      id: e.id,
      voucherNumber: e.voucherNumber ?? '',
      type: e.voucherType,
      direction: e.voucherType === 'Receipt' ? 'Deposit' : 'Withdrawal',
      amount: e.amount,
      balanceAfter: e.balanceAfter,
      date: e.date,
      treasuryId: e.counterpartyTreasuryId,
      treasuryName: e.counterpartyTreasuryName,
      capitalClassificationId: e.capitalClassificationId,
      capitalClassificationName: e.capitalClassificationName,
      notes: e.notes,
      userName: '',
    };
  }

  private fetch(pageIndex: number, pageSize: number, force: boolean): void {
    this.loading.set(true);
    this.error.set(null);

    const from = this.fromDate() || undefined;
    const to = this.toDate() || undefined;
    const query: CompanyProfitStatementQuery = {
      pageIndex,
      pageSize,
      fromDate: from,
      toDate: to,
    };

    const stream$ = force
      ? this.service.refreshCompanyProfitStatement(query)
      : this.service.getCompanyProfitStatement(query);

    stream$.subscribe({
      next: (res) => {
        this.statement.set(res);
        this.count.set(res.entries.count ?? 0);
        this.totalPages.set(res.entries.totalPages ?? 0);
        this.appliedFrom.set(from ?? '');
        this.appliedTo.set(to ?? '');
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.statement.set(null);
        this.count.set(0);
        this.totalPages.set(0);
        this.error.set(err?.message || 'تعذّر تحميل كشف الحساب');
        this.loading.set(false);
        this.toast.error(err?.message || 'تعذّر تحميل كشف الحساب');
      },
    });
  }
}
