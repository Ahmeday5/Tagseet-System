import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { VouchersService } from '../../services/vouchers.service';
import { VoucherDto, UpdateVoucherPayload } from '../../models/voucher.model';
import {
  ReferenceType,
  RelatedPartyType,
  VoucherType,
} from '../../enums/voucher.enums';
import {
  REFERENCE_TYPE_BADGE,
  REFERENCE_TYPE_LABELS,
  RELATED_PARTY_TYPE_BADGE,
  RELATED_PARTY_TYPE_LABELS,
  RELATED_PARTY_TYPE_OPTIONS,
  VOUCHER_TYPE_BADGE,
  VOUCHER_TYPE_LABELS,
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
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { ToastService } from '../../../../core/services/toast.service';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../core/constants/permissions.const';
import { VoucherFormModalComponent } from '../../components/voucher-form-modal/voucher-form-modal.component';
import { PrintService } from '../../../../core/services/print.service';
import { fetchAllPages } from '../../../../core/utils/api-list.util';

import { TreasuryService } from '../../../treasury/services/treasury.service';
import { CustomersService } from '../../../customers/services/customers.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { LookupItem } from '../../../../core/models/lookup.model';

interface PartyOption { id: number; name: string; }

const DEFAULT_PAGE_SIZE = 10;
const REFETCH_DEBOUNCE_MS = 200;

@Component({
  selector: 'app-vouchers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    FormsModule,
    BadgeComponent,
    PaginationComponent,
    ModalComponent,
    CurrencyArPipe,
    DateArPipe,
    VoucherTypeLabelPipe,
    ReferenceTypeLabelPipe,
    RelatedPartyTypeLabelPipe,
    HasPermissionDirective,
    VoucherFormModalComponent,
  ],
  templateUrl: './vouchers-list.component.html',
  styleUrl: './vouchers-list.component.scss',
})
export class VouchersListComponent {
  private readonly svc = inject(VouchersService);
  private readonly toast = inject(ToastService);
  private readonly cache = inject(HttpCacheService);
  private readonly printer = inject(PrintService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly customersService = inject(CustomersService);
  private readonly suppliersService = inject(SuppliersService);

  protected readonly isPrinting = signal(false);

  // ── data ──
  protected readonly vouchers = signal<VoucherDto[]>([]);
  protected readonly loading = signal(false);

  // ── filters ──
  protected readonly typeFilter = signal<VoucherType | ''>('');
  protected readonly searchTerm = signal('');
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  // ── server pagination meta ──
  protected readonly count = signal(0);
  protected readonly totalPages = signal(0);

  /** Exposed so the template can gate the create button with `*appHasPermission`. */
  protected readonly PERMS = PERMISSIONS;

  // ── create-voucher modal ──
  protected readonly showForm = signal(false);

  // ── voucher-number detail modal ──
  protected readonly detailOpen = signal(false);
  protected readonly detailVoucher = signal<VoucherDto | null>(null);

  // ── derived ──
  protected readonly hasFilters = computed(
    () => !!this.typeFilter() || this.searchTerm().trim().length > 0,
  );

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
  protected readonly partyTypeOptions = RELATED_PARTY_TYPE_OPTIONS;

  // ── edit-voucher modal state ──
  protected readonly editOpen = signal(false);
  protected readonly editSubmitting = signal(false);
  protected readonly editTarget = signal<VoucherDto | null>(null);
  protected readonly editForm = signal<{
    amount: number;
    treasuryId: number | null;
    date: string;
    relatedPartyType: RelatedPartyType;
    relatedPartyId: number | null;
    notes: string;
  }>({
    amount: 0,
    treasuryId: null,
    date: '',
    relatedPartyType: RelatedPartyType.Customer,
    relatedPartyId: null,
    notes: '',
  });

  // ── edit-voucher lookup data ──
  protected readonly editTreasuries = signal<LookupItem[]>([]);
  protected readonly editClients = signal<PartyOption[]>([]);
  protected readonly editSuppliers = signal<PartyOption[]>([]);
  protected readonly editPartyLoading = signal(false);

  protected readonly editPartyList = computed<PartyOption[]>(() => {
    switch (this.editForm().relatedPartyType) {
      case RelatedPartyType.Customer: return this.editClients();
      case RelatedPartyType.Supplier: return this.editSuppliers();
      default: return [];
    }
  });

  protected readonly editNeedsParty = computed(
    () => this.editForm().relatedPartyType !== RelatedPartyType.Other,
  );

  /** Combined trigger — any filter / page change refetches. */
  private readonly fetchTrigger = computed(() => ({
    pageIndex: this.pageIndex(),
    pageSize: this.pageSize(),
    type: this.typeFilter(),
    search: this.searchTerm().trim(),
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

  // ─────────── edit-voucher modal ───────────

  protected openEdit(v: VoucherDto): void {
    this.editTarget.set(v);
    this.editForm.set({
      amount: v.amount,
      treasuryId: null,
      date: v.date.split('T')[0],
      relatedPartyType: v.relatedPartyType,
      relatedPartyId: null,
      notes: v.notes ?? '',
    });
    this.editOpen.set(true);
    this.loadEditLookups(v.relatedPartyType);
  }

  protected closeEdit(): void {
    if (this.editSubmitting()) return;
    this.editOpen.set(false);
    this.editTarget.set(null);
  }

  protected updateEditForm<K extends keyof ReturnType<typeof this.editForm>>(
    key: K,
    value: ReturnType<typeof this.editForm>[K],
  ): void {
    this.editForm.update((f) => ({ ...f, [key]: value }));
  }

  protected onEditPartyTypeChange(value: string): void {
    const next = value as RelatedPartyType;
    this.editForm.update((f) => ({ ...f, relatedPartyType: next, relatedPartyId: null }));
    if (next !== RelatedPartyType.Other) this.loadEditParties(next);
  }

  protected submitEdit(): void {
    const target = this.editTarget();
    const f = this.editForm();
    if (!target) return;

    if (!f.amount || f.amount <= 0) { this.toast.error('أدخل مبلغًا صحيحًا'); return; }
    if (!f.treasuryId) { this.toast.error('اختر الخزينة'); return; }
    if (f.relatedPartyType !== RelatedPartyType.Other && !f.relatedPartyId) {
      this.toast.error('اختر الجهة المرتبطة');
      return;
    }

    const payload: UpdateVoucherPayload = {
      amount: Number(f.amount),
      treasuryId: f.treasuryId,
      date: f.date,
      relatedPartyType: f.relatedPartyType,
      relatedPartyId: f.relatedPartyType === RelatedPartyType.Other
        ? 0
        : Number(f.relatedPartyId),
      notes: f.notes?.trim() ?? '',
    };

    this.editSubmitting.set(true);
    this.svc.update(target.id, payload).subscribe({
      next: () => {
        this.editSubmitting.set(false);
        this.editOpen.set(false);
        this.editTarget.set(null);
        this.toast.success('تم تعديل السند بنجاح');
        this.refresh();
      },
      error: (err: ApiError) => {
        this.editSubmitting.set(false);
        this.toast.error(apiErrorToMessage(err, 'فشل تعديل السند'));
      },
    });
  }

  private loadEditLookups(partyType: RelatedPartyType): void {
    if (this.editTreasuries().length === 0) {
      this.treasuryService.lookup().subscribe({
        next: (list) => this.editTreasuries.set(list ?? []),
        error: () => {},
      });
    }
    if (partyType !== RelatedPartyType.Other) this.loadEditParties(partyType);
  }

  private loadEditParties(type: RelatedPartyType): void {
    if (type === RelatedPartyType.Customer && this.editClients().length === 0) {
      this.editPartyLoading.set(true);
      this.customersService.listAllClients().subscribe({
        next: (list) => {
          this.editClients.set(list.map((c) => ({ id: c.id, name: c.fullName })));
          this.editPartyLoading.set(false);
        },
        error: () => { this.editClients.set([]); this.editPartyLoading.set(false); },
      });
    }
    if (type === RelatedPartyType.Supplier && this.editSuppliers().length === 0) {
      this.editPartyLoading.set(true);
      this.suppliersService.listAll().subscribe({
        next: (list) => {
          this.editSuppliers.set(list.map((s) => ({ id: s.id, name: s.fullName })));
          this.editPartyLoading.set(false);
        },
        error: () => { this.editSuppliers.set([]); this.editPartyLoading.set(false); },
      });
    }
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

  /** Exports every voucher matching the active type filter to a PDF. */
  protected printVouchers(): void {
    if (this.isPrinting()) return;
    this.isPrinting.set(true);
    const type = this.typeFilter();
    const search = this.searchTerm().trim();

    fetchAllPages<VoucherDto>((pageIndex, pageSize) =>
      this.svc.refresh({ pageIndex, pageSize, type, search }),
    ).subscribe({
      next: (rows) => {
        this.isPrinting.set(false);
        const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
        const meta: Array<{ label: string; value: string }> = [];
        if (type) meta.push({ label: 'النوع', value: VOUCHER_TYPE_LABELS[type] });
        if (search) meta.push({ label: 'بحث', value: search });

        this.printer.print<VoucherDto>({
          title: 'سجل السندات المالية',
          subtitle: 'سندات القبض والصرف',
          meta,
          orientation: 'landscape',
          columns: [
            { key: 'voucherNumber', header: 'رقم السند', align: 'center', bold: true },
            {
              key: 'type',
              header: 'النوع',
              align: 'center',
              format: (v) => VOUCHER_TYPE_LABELS[v as VoucherType] ?? String(v),
            },
            { key: 'amount', header: 'المبلغ', align: 'end', format: 'currency', bold: true },
            { key: 'treasuryName', header: 'الخزينة', align: 'start' },
            {
              key: 'relatedPartyType',
              header: 'الطرف',
              align: 'center',
              format: (v) => RELATED_PARTY_TYPE_LABELS[v as RelatedPartyType] ?? String(v),
            },
            { key: 'relatedPartyName', header: 'اسم الطرف', align: 'start', bold: true },
            {
              key: 'referenceType',
              header: 'المرجع',
              align: 'center',
              format: (v) => REFERENCE_TYPE_LABELS[v as ReferenceType] ?? String(v),
            },
            { key: 'date', header: 'التاريخ', align: 'center', format: 'shortDate' },
            {
              key: 'notes',
              header: 'ملاحظات',
              align: 'start',
              format: (v) => this.cleanNotes(v as string | null),
            },
          ],
          totals: {
            label: 'الإجمالي',
            labelColSpan: 2,
            cells: [
              `${Math.round(total).toLocaleString('ar-EG')} ج.م`,
              '',
              '',
              '',
              '',
              '',
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

  // ─────────── create-voucher modal ───────────

  protected openForm(): void {
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
  }

  protected onVoucherCreated(): void {
    this.showForm.set(false);
    // Service invalidated the cache; force a fresh first page so the new
    // voucher is visible immediately.
    if (this.pageIndex() !== 1) this.pageIndex.set(1);
    else this.refresh();
  }

  // ─────────── filter handlers ───────────

  protected onTypeChange(value: string): void {
    this.typeFilter.set(value as VoucherType | '');
    this.resetPage();
  }

  protected onSearch(value: string): void {
    this.searchTerm.set(value);
    this.resetPage();
  }

  protected clearSearch(): void {
    if (!this.searchTerm()) return;
    this.searchTerm.set('');
    this.resetPage();
  }

  protected clearFilters(): void {
    this.typeFilter.set('');
    this.searchTerm.set('');
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

  // ─────────── view helpers ───────────

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
