import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { PrintService } from '../../../../core/services/print.service';
import { ToastService } from '../../../../core/services/toast.service';
import { fetchAllPages } from '../../../../core/utils/api-list.util';

import { VoucherType } from '../../../vouchers/enums/voucher.enums';
import {
  VOUCHER_TYPE_BADGE,
  VOUCHER_TYPE_LABELS,
} from '../../../vouchers/constants/voucher-labels';

import { TreasuryService } from '../../services/treasury.service';
import { SubAccountsService } from '../../services/sub-accounts.service';
import {
  SubAccount,
  SubAccountStatement,
  SubAccountVoucher,
  UpdateSubAccountVoucherPayload,
} from '../../models/sub-account.model';
import { LookupItem } from '../../../../core/models/lookup.model';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Per-account ledger (كشف حساب). Shows the account header plus a paginated,
 * running-balance list of its receipt/payment vouchers, and exports the full
 * filtered ledger to a PDF.
 */
@Component({
  selector: 'app-sub-account-statement-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ModalComponent,
    PaginationComponent,
    BadgeComponent,
    CurrencyArPipe,
    DateArPipe,
  ],
  templateUrl: './sub-account-statement-modal.component.html',
  styleUrl: './sub-account-statement-modal.component.scss',
})
export class SubAccountStatementModalComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();
  readonly account = input<SubAccount | null>(null);

  // ── outputs ──
  readonly closed = output<void>();

  // ── deps ──
  private readonly service = inject(SubAccountsService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly printer = inject(PrintService);
  private readonly toast = inject(ToastService);

  // ── state ──
  protected readonly statement = signal<SubAccountStatement | null>(null);
  protected readonly loading = signal(false);
  protected readonly isPrinting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly count = signal(0);
  protected readonly totalPages = signal(0);

  // ── derived ──
  protected readonly header = computed(
    () => this.statement()?.account ?? this.account(),
  );
  protected readonly vouchers = computed(
    () => this.statement()?.vouchers.data ?? [],
  );
  protected readonly title = computed(() => {
    const a = this.header();
    return a ? `كشف حساب — ${a.name}` : 'كشف حساب فرعي';
  });

  /** Totals across the visible page — quick orientation, not the grand total. */
  protected readonly pageReceipts = computed(() =>
    this.vouchers()
      .filter((v) => v.type === VoucherType.Receipt)
      .reduce((s, v) => s + (v.amount ?? 0), 0),
  );
  protected readonly pagePayments = computed(() =>
    this.vouchers()
      .filter((v) => v.type === VoucherType.Payment)
      .reduce((s, v) => s + (v.amount ?? 0), 0),
  );

  // ── edit-voucher modal state ──
  protected readonly treasuries = signal<LookupItem[]>([]);
  protected readonly editVoucherOpen = signal(false);
  protected readonly editVoucherSubmitting = signal(false);
  protected readonly editVoucherTarget = signal<SubAccountVoucher | null>(null);
  protected readonly editVoucherForm = signal<{
    amount: number;
    treasuryId: number | null;
    date: string;
    notes: string;
  }>({ amount: 0, treasuryId: null, date: '', notes: '' });

  private lastAccountId: number | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        const account = this.account();
        if (!account) return;
        this.resetIfNewAccount(account.id);
        const page = this.pageIndex();
        const size = this.pageSize();
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(
          () => this.fetch(account.id, page, size, false),
          120,
        );
      },
      { allowSignalWrites: true },
    );

    // Load treasuries once for the edit-voucher form.
    effect(
      () => {
        if (!this.open() || this.treasuries().length > 0) return;
        this.treasuryService.lookup().subscribe({
          next: (list) => this.treasuries.set(list),
          error: () => {},
        });
      },
      { allowSignalWrites: true },
    );
  }

  // ─────────── template handlers ───────────

  protected close(): void {
    this.closed.emit();
  }

  protected refresh(): void {
    const account = this.account();
    if (!account) return;
    this.fetch(account.id, this.pageIndex(), this.pageSize(), true);
  }

  protected onPageChange(page: number): void {
    this.pageIndex.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    if (this.pageIndex() !== 1) this.pageIndex.set(1);
  }

  protected typeLabel(type: VoucherType): string {
    return VOUCHER_TYPE_LABELS[type] ?? type;
  }

  protected typeBadge(type: VoucherType) {
    return VOUCHER_TYPE_BADGE[type] ?? 'info';
  }

  protected isReceipt(type: VoucherType): boolean {
    return type === VoucherType.Receipt;
  }

  /** Exports every voucher in the ledger (all pages) to a PDF. */
  protected print(): void {
    const account = this.header();
    if (!account || this.isPrinting()) return;
    this.isPrinting.set(true);

    fetchAllPages<SubAccountVoucher>((pageIndex, pageSize) =>
      this.service
        .refreshStatement(account.id, { pageIndex, pageSize })
        .pipe(map((s) => s.vouchers)),
    ).subscribe({
      next: (rows) => {
        this.isPrinting.set(false);
        const receipts = rows
          .filter((r) => r.type === VoucherType.Receipt)
          .reduce((s, r) => s + (r.amount ?? 0), 0);
        const payments = rows
          .filter((r) => r.type === VoucherType.Payment)
          .reduce((s, r) => s + (r.amount ?? 0), 0);

        this.printer.print<SubAccountVoucher>({
          title: 'كشف حساب فرعي',
          subtitle: account.name,
          meta: [
            { label: 'رقم الهاتف', value: account.phoneNumber || '—' },
            { label: 'الرصيد الحالي', value: `${Math.round(account.balance).toLocaleString('ar-EG')} ج.م` },
            { label: 'عدد السندات', value: String(rows.length) },
          ],
          orientation: 'landscape',
          columns: [
            { key: 'date', header: 'التاريخ', align: 'center', format: 'shortDate' },
            { key: 'voucherNumber', header: 'رقم السند', align: 'center' },
            {
              key: 'type',
              header: 'النوع',
              align: 'center',
              format: (v) => VOUCHER_TYPE_LABELS[v as VoucherType] ?? String(v),
            },
            { key: 'amount', header: 'المبلغ', align: 'end', format: 'currency', bold: true },
            { key: 'balanceAfter', header: 'الرصيد بعد', align: 'end', format: 'currency' },
            { key: 'notes', header: 'ملاحظات', align: 'start' },
          ],
          totals: {
            label: 'الإجمالي (قبض / صرف)',
            labelColSpan: 3,
            cells: [
              `${Math.round(receipts).toLocaleString('ar-EG')} / ${Math.round(payments).toLocaleString('ar-EG')} ج.م`,
              `${Math.round(account.balance).toLocaleString('ar-EG')} ج.م`,
              '',
            ],
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

  // ─────────── edit-voucher handlers ───────────

  protected openEditVoucher(v: SubAccountVoucher): void {
    this.editVoucherTarget.set(v);
    this.editVoucherForm.set({
      amount: v.amount,
      treasuryId: this.treasuries()[0]?.id ?? null,
      date: v.date.split('T')[0],
      notes: v.notes ?? '',
    });
    this.editVoucherOpen.set(true);
  }

  protected closeEditVoucher(): void {
    if (this.editVoucherSubmitting()) return;
    this.editVoucherOpen.set(false);
    this.editVoucherTarget.set(null);
  }

  protected updateEditVoucherForm<K extends keyof ReturnType<typeof this.editVoucherForm>>(
    key: K,
    value: ReturnType<typeof this.editVoucherForm>[K],
  ): void {
    this.editVoucherForm.update((f) => ({ ...f, [key]: value }));
  }

  protected submitEditVoucher(): void {
    const target = this.editVoucherTarget();
    const f = this.editVoucherForm();
    if (!target) return;
    if (!f.amount || f.amount <= 0) {
      this.toast.error('أدخل مبلغًا صحيحًا');
      return;
    }
    if (!f.treasuryId) {
      this.toast.error('اختر الخزينة');
      return;
    }

    const payload: UpdateSubAccountVoucherPayload = {
      treasuryId: f.treasuryId,
      amount: Number(f.amount),
      date: f.date,
      notes: f.notes?.trim() ?? '',
    };

    this.editVoucherSubmitting.set(true);
    this.service.updateVoucher(target.id, payload).subscribe({
      next: () => {
        this.editVoucherSubmitting.set(false);
        this.editVoucherOpen.set(false);
        this.editVoucherTarget.set(null);
        this.toast.success('تم تعديل السند بنجاح');
        const account = this.account();
        if (account) this.fetch(account.id, this.pageIndex(), this.pageSize(), true);
      },
      error: (err: ApiError) => {
        this.editVoucherSubmitting.set(false);
        this.toast.error(err?.message || 'فشل تعديل السند');
      },
    });
  }

  // ─────────── internals ───────────

  private resetIfNewAccount(id: number): void {
    if (this.lastAccountId === id) return;
    this.lastAccountId = id;
    this.statement.set(null);
    this.error.set(null);
    if (this.pageIndex() !== 1) this.pageIndex.set(1);
  }

  private fetch(
    id: number,
    pageIndex: number,
    pageSize: number,
    force: boolean,
  ): void {
    this.loading.set(true);
    this.error.set(null);

    const stream$ = force
      ? this.service.refreshStatement(id, { pageIndex, pageSize })
      : this.service.statement(id, { pageIndex, pageSize });

    stream$.subscribe({
      next: (res) => {
        this.statement.set(res);
        this.count.set(res.vouchers.count ?? 0);
        this.totalPages.set(res.vouchers.totalPages ?? 0);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.statement.set(null);
        this.count.set(0);
        this.totalPages.set(0);
        this.error.set(err?.message || 'تعذّر تحميل كشف الحساب — حاول مرة أخرى');
        this.loading.set(false);
      },
    });
  }
}
