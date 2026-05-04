import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { InvoicesService } from '../../services/invoices.service';
import {
  PURCHASE_INVOICE_STATUS_VIEW,
  PurchaseInvoice,
  PurchaseInvoiceListItem,
  PurchaseInvoiceStatus,
  PurchaseInvoiceStatusView,
  PurchaseInvoiceSummary,
} from '../../models/invoice.model';
import { Supplier } from '../../../suppliers/models/supplier.model';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { ConfirmInvoiceModalComponent } from '../../components/confirm-invoice-modal/confirm-invoice-modal.component';

const STATUS_OPTIONS: ReadonlyArray<{
  value: PurchaseInvoiceStatus | '';
  label: string;
}> = [
  { value: '',              label: 'كل الحالات' },
  { value: 'Draft',         label: 'مسودة' },
  { value: 'Pending',       label: 'بانتظار الدفع' },
  { value: 'PartiallyPaid', label: 'جزئية' },
  { value: 'Paid',          label: 'مسددة' },
  { value: 'Confirmed',     label: 'مؤكدة' },
  { value: 'Cancelled',     label: 'ملغية' },
];

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe, ConfirmInvoiceModalComponent],
  templateUrl: './invoices-list.component.html',
  styleUrl: './invoices-list.component.scss',
})
export class InvoicesListComponent implements OnInit {
  private readonly svc              = inject(InvoicesService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly router           = inject(Router);
  private readonly toast            = inject(ToastService);

  // ── data ──
  protected readonly invoices  = signal<PurchaseInvoiceListItem[]>([]);
  protected readonly summary   = signal<PurchaseInvoiceSummary | null>(null);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly loading   = signal(false);

  // ── filters ──
  protected readonly searchTerm   = signal('');
  protected readonly statusFilter = signal<PurchaseInvoiceStatus | ''>('');
  protected readonly supplierFilter = signal<number | ''>('');

  // ── confirm modal ──
  protected readonly confirmOpen   = signal(false);
  protected readonly confirmTarget = signal<PurchaseInvoiceListItem | null>(null);

  // ── derived ──
  protected readonly statusOptions = STATUS_OPTIONS;

  /**
   * Stable, debounce-able payload used to refetch the list. Combining
   * the three filter signals into one computed lets the effect treat
   * the trio as a single trigger.
   */
  private readonly filterPayload = computed(() => ({
    search: this.searchTerm().trim(),
    status: this.statusFilter(),
    supplierId: this.supplierFilter(),
  }));

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Refetch the list whenever filters change, with a small debounce so
    // typing in the search box doesn't fire a request per keystroke.
    effect(() => {
      const payload = this.filterPayload();
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.fetchList(payload), 250);
    });
  }

  ngOnInit(): void {
    this.fetchSummary();
    this.fetchSuppliers();
  }

  // ─────────── data loaders ───────────

  protected fetchList(
    payload: { search: string; status: PurchaseInvoiceStatus | ''; supplierId: number | '' },
    force = false,
  ): void {
    this.loading.set(true);
    const stream$ = force
      ? this.svc.refreshList(payload)
      : this.svc.list(payload);
    stream$.subscribe({
      next: (list) => {
        this.invoices.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.invoices.set([]);
        this.loading.set(false);
      },
    });
  }

  protected fetchSummary(): void {
    this.svc.getSummary().subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.summary.set(null),
    });
  }

  private fetchSuppliers(): void {
    this.suppliersService.listAll().subscribe({
      next: (list) => this.suppliers.set(list),
      error: () => this.suppliers.set([]),
    });
  }

  protected refresh(): void {
    this.fetchList(this.filterPayload(), true);
    this.fetchSummary();
  }

  // ─────────── filter handlers ───────────

  protected onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value as PurchaseInvoiceStatus | '');
  }

  protected onSupplierChange(value: string): void {
    this.supplierFilter.set(value === '' ? '' : Number(value));
  }

  // ─────────── navigation ───────────

  protected goToNew(): void {
    this.router.navigate(['/invoices/new']);
  }

  // ─────────── confirm modal ───────────

  protected openConfirm(inv: PurchaseInvoiceListItem): void {
    this.confirmTarget.set(inv);
    this.confirmOpen.set(true);
  }

  protected closeConfirm(): void {
    this.confirmOpen.set(false);
  }

  protected onConfirmed(updated: PurchaseInvoice): void {
    this.confirmOpen.set(false);
    this.invoices.update((list) =>
      list.map((i) =>
        i.id === updated.id
          ? {
              ...i,
              status: updated.status,
              paidAmount: updated.paidAmount,
              remainingAmount: updated.remainingAmount,
              totalAmount: updated.totalAmount,
            }
          : i,
      ),
    );
    // Refresh summary in the background so the cards reflect the change.
    this.fetchSummary();
  }

  // ─────────── view helpers ───────────

  protected statusView(status: PurchaseInvoiceStatus): PurchaseInvoiceStatusView {
    return PURCHASE_INVOICE_STATUS_VIEW[status] ?? {
      label: status,
      variant: 'info',
    };
  }

  protected isDraft(inv: PurchaseInvoiceListItem): boolean {
    return inv.status === 'Draft';
  }

  protected formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected viewInvoice(inv: PurchaseInvoiceListItem): void {
    this.toast.info(`عرض تفاصيل الفاتورة ${inv.invoiceNumber} — قيد التطوير`);
  }
}
