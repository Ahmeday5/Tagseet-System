import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PERMISSIONS } from '../../../../core/constants/permissions.const';
import { InvoicesService } from '../../services/invoices.service';
import {
  PURCHASE_INVOICE_STATUS_VIEW,
  PurchaseInvoice,
  PurchaseInvoiceStatusView,
} from '../../models/invoice.model';
import { ConfirmInvoiceModalComponent } from '../../components/confirm-invoice-modal/confirm-invoice-modal.component';
import { PayInvoiceModalComponent } from '../../components/pay-invoice-modal/pay-invoice-modal.component';

/**
 * Standalone invoice details / preview page.
 *
 *   /invoices/:id  →  full document view, print-ready
 *
 * Lives outside the tabbed shell because the print view shouldn't
 * carry the list/new chrome. From here the user can print, return to
 * the list, or — if the invoice is still a Draft — open the confirm
 * modal to attach a treasury and finalize it.
 */
@Component({
  selector: 'app-invoice-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CurrencyArPipe,
    ConfirmInvoiceModalComponent,
    PayInvoiceModalComponent,
  ],
  templateUrl: './invoice-details.component.html',
  styleUrl: './invoice-details.component.scss',
})
export class InvoiceDetailsComponent implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly svc     = inject(InvoicesService);
  private readonly toast   = inject(ToastService);
  private readonly dialog  = inject(DialogService);
  private readonly auth    = inject(AuthService);

  // ── data ──
  protected readonly invoice    = signal<PurchaseInvoice | null>(null);
  protected readonly loading    = signal(false);
  protected readonly notFound   = signal(false);

  // ── confirm modal ──
  protected readonly confirmOpen = signal(false);

  // ── payment modal ──
  protected readonly paymentOpen = signal(false);

  // ── delete ──
  protected readonly deleting = signal(false);

  /**
   * Same owners-only gate used across the invoices feature: Representatives
   * may create/view invoices but must not delete them.
   */
  protected readonly canDelete = computed(
    () =>
      this.auth.hasPermission(PERMISSIONS.suppliersFullAccess) &&
      !this.auth.hasAnyRole(['Representative']),
  );

  // ── derived ──
  protected readonly status = computed<PurchaseInvoiceStatusView | null>(() => {
    const inv = this.invoice();
    if (!inv) return null;
    return PURCHASE_INVOICE_STATUS_VIEW[inv.status] ?? {
      label: inv.status,
      variant: 'info',
    };
  });

  protected readonly canConfirm = computed(
    () => this.invoice()?.status === 'Draft',
  );

  protected readonly canPay = computed(() => {
    const inv = this.invoice();
    if (!inv) return false;
    return (
      (inv.remainingAmount ?? 0) > 0 &&
      inv.status !== 'Draft' &&
      inv.status !== 'Cancelled'
    );
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!idParam || Number.isNaN(id) || id <= 0) {
      this.notFound.set(true);
      return;
    }
    this.fetch(id);
  }

  // ─────────── data ───────────

  private fetch(id: number): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.svc.getById(id).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.toast.error(err.message || 'تعذّر تحميل بيانات الفاتورة');
        }
      },
    });
  }

  // ─────────── confirm ───────────

  protected openConfirm(): void {
    if (!this.canConfirm()) return;
    this.confirmOpen.set(true);
  }

  protected closeConfirm(): void {
    this.confirmOpen.set(false);
  }

  protected onConfirmed(updated: PurchaseInvoice): void {
    this.confirmOpen.set(false);
    this.invoice.set(updated);
    this.toast.success(`تم تأكيد الفاتورة ${updated.invoiceNumber}`);
  }

  // ─────────── payment ───────────

  protected openPayment(): void {
    if (!this.canPay()) return;
    this.paymentOpen.set(true);
  }

  protected closePayment(): void {
    this.paymentOpen.set(false);
  }

  protected onPaid(updated: PurchaseInvoice): void {
    this.paymentOpen.set(false);
    this.invoice.set(updated);
  }

  // ─────────── delete ───────────

  protected async deleteInvoice(): Promise<void> {
    const inv = this.invoice();
    if (!inv || this.deleting()) return;

    const ok = await this.dialog.confirm({
      title: 'حذف فاتورة',
      message: `هل أنت متأكد من حذف الفاتورة "${inv.invoiceNumber}"؟ سيتم عكس كميات المخزون واسترجاع أي مبلغ مدفوع إلى الخزينة، ولا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (!ok) return;

    this.deleting.set(true);
    this.svc.delete(inv.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toast.success('تم حذف الفاتورة بنجاح');
        this.goToList();
      },
      error: (err: ApiError) => {
        this.deleting.set(false);
        this.toast.error(err.message || 'تعذّر حذف الفاتورة');
      },
    });
  }

  // ─────────── print ───────────

  protected print(): void {
    if (typeof window === 'undefined') return;
    window.print();
  }

  // ─────────── nav ───────────

  protected goToList(): void {
    this.router.navigate(['/invoices/list']);
  }

  // ─────────── view helpers ───────────

  protected formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

}
