import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { VouchersService } from '../../services/vouchers.service';
import { VoucherDto } from '../../models/voucher.model';
import {
  ReferenceType,
  RelatedPartyType,
  VoucherType,
} from '../../enums/voucher.enums';
import {
  REFERENCE_TYPE_BADGE,
  RELATED_PARTY_TYPE_BADGE,
  VOUCHER_TYPE_BADGE,
  VOUCHER_TYPE_OPTIONS,
} from '../../constants/voucher-labels';
import { VoucherTypeLabelPipe } from '../../pipes/voucher-type-label.pipe';
import { ReferenceTypeLabelPipe } from '../../pipes/reference-type-label.pipe';
import { RelatedPartyTypeLabelPipe } from '../../pipes/related-party-type-label.pipe';

import {
  BadgeComponent,
  BadgeType,
} from '../../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';

const DEFAULT_PAGE_SIZE = 10;
const REFETCH_DEBOUNCE_MS = 200;
/** Voucher numbers are 70+ chars; show only the meaningful prefix in the table. */
const VOUCHER_NUMBER_PREFIX_LEN = 18;

@Component({
  selector: 'app-vouchers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    BadgeComponent,
    PaginationComponent,
    ModalComponent,
    CurrencyArPipe,
    DateArPipe,
    VoucherTypeLabelPipe,
    ReferenceTypeLabelPipe,
    RelatedPartyTypeLabelPipe,
  ],
  templateUrl: './vouchers-list.component.html',
  styleUrl: './vouchers-list.component.scss',
})
export class VouchersListComponent {
  private readonly svc = inject(VouchersService);
  private readonly toast = inject(ToastService);
  private readonly cache = inject(HttpCacheService);

  // ── data ──
  protected readonly vouchers = signal<VoucherDto[]>([]);
  protected readonly loading = signal(false);

  // ── filters ──
  protected readonly typeFilter = signal<VoucherType | ''>('');
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  // ── server pagination meta ──
  protected readonly count = signal(0);
  protected readonly totalPages = signal(0);

  // ── voucher-number detail modal ──
  protected readonly detailOpen = signal(false);
  protected readonly detailVoucher = signal<VoucherDto | null>(null);

  // ── derived ──
  protected readonly hasFilters = computed(() => !!this.typeFilter());

  protected readonly totalAmount = computed(() =>
    this.vouchers().reduce((sum, v) => sum + (v.amount ?? 0), 0),
  );

  protected readonly receiptCount = computed(
    () => this.vouchers().filter((v) => v.type === VoucherType.Receipt).length,
  );

  protected readonly paymentCount = computed(
    () => this.vouchers().filter((v) => v.type === VoucherType.Payment).length,
  );

  // ── select options ──
  protected readonly typeOptions = VOUCHER_TYPE_OPTIONS;

  /** Combined trigger — any filter / page change refetches. */
  private readonly fetchTrigger = computed(() => ({
    pageIndex: this.pageIndex(),
    pageSize: this.pageSize(),
    type: this.typeFilter(),
  }));

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const trigger = this.fetchTrigger();
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(
        () => this.fetch(trigger),
        REFETCH_DEBOUNCE_MS,
      );
    });

    // Any treasury / installment / contract write may produce a voucher —
    // refresh whenever the global cache invalidates one of those scopes.
    onInvalidate(this.cache, 'treasur', () => this.refresh());
    onInvalidate(this.cache, 'installment', () => this.refresh());
    onInvalidate(this.cache, 'invoice', () => this.refresh());
    onInvalidate(this.cache, 'payment', () => this.refresh());
    onInvalidate(this.cache, 'contract', () => this.refresh());
  }

  // ─────────── data loaders ───────────

  private fetch(
    trigger: ReturnType<typeof this.fetchTrigger>,
    force = false,
  ): void {
    this.loading.set(true);
    const stream$ = force ? this.svc.refresh(trigger) : this.svc.list(trigger);

    stream$.subscribe({
      next: (page) => {
        this.vouchers.set(page?.data ?? []);
        this.count.set(page?.count ?? 0);
        this.totalPages.set(page?.totalPages ?? 0);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.vouchers.set([]);
        this.count.set(0);
        this.totalPages.set(0);
        this.loading.set(false);
        this.toast.error(err?.message || 'تعذّر تحميل السندات');
      },
    });
  }

  protected refresh(): void {
    this.fetch(this.fetchTrigger(), true);
  }

  // ─────────── filter handlers ───────────

  protected onTypeChange(value: string): void {
    this.typeFilter.set(value as VoucherType | '');
    this.resetPage();
  }

  protected clearFilters(): void {
    this.typeFilter.set('');
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

  // ─────────── voucher-number detail modal ───────────

  protected openDetail(v: VoucherDto): void {
    this.detailVoucher.set(v);
    this.detailOpen.set(true);
  }

  protected closeDetail(): void {
    this.detailOpen.set(false);
  }

  protected copyVoucherNumber(): void {
    const number = this.detailVoucher()?.voucherNumber;
    if (!number) return;
    const clipboard = navigator.clipboard;
    if (clipboard?.writeText) {
      clipboard.writeText(number).then(
        () => this.toast.success('تم نسخ رقم السند'),
        () => this.toast.error('تعذّر النسخ'),
      );
    } else {
      this.toast.error('النسخ غير مدعوم في هذا المتصفح');
    }
  }

  // ─────────── view helpers ───────────

  /**
   * Backend voucher numbers are 70+ chars (`RCP-INST-<timestamp>-<guid>`).
   * Showing the full string blows the column up, so we truncate to the
   * meaningful business prefix and let users open the detail modal to see
   * (and copy) the full identifier.
   */
  protected shortVoucherNumber(value: string): string {
    if (!value) return '—';
    return value.length > VOUCHER_NUMBER_PREFIX_LEN
      ? `${value.slice(0, VOUCHER_NUMBER_PREFIX_LEN)}…`
      : value;
  }

  protected isTruncated(value: string): boolean {
    return !!value && value.length > VOUCHER_NUMBER_PREFIX_LEN;
  }

  protected typeBadge(type: VoucherType): BadgeType {
    return VOUCHER_TYPE_BADGE[type] ?? 'info';
  }

  protected referenceBadge(ref: ReferenceType): BadgeType {
    return REFERENCE_TYPE_BADGE[ref] ?? 'info';
  }

  protected relatedPartyBadge(party: RelatedPartyType): BadgeType {
    return RELATED_PARTY_TYPE_BADGE[party] ?? 'info';
  }

  protected isReceipt(type: VoucherType): boolean {
    return type === VoucherType.Receipt;
  }

  /** Strips repetitive `"Payment Method: cash."` prefixes for tighter rows. */
  protected cleanNotes(notes: string | null): string {
    if (!notes) return '—';
    const trimmed = notes.replace(/Payment Method:\s*\w+\.?/i, '').trim();
    return trimmed || '—';
  }
}
