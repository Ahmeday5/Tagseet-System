import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { InvoicesService } from '../../services/invoices.service';
import { InvoiceLineForm, InvoiceSupplier, InvoiceWarehouse, InvoicePaymentMethod, InvoiceStatus } from '../../models/invoice.model';

@Component({
  selector: 'app-invoice-new',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CurrencyArPipe],
  templateUrl: './invoice-new.component.html',
  styleUrl: './invoice-new.component.scss',
})
export class InvoiceNewComponent implements OnInit {
  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(InvoicesService);
  private readonly toast   = inject(ToastService);
  private readonly router  = inject(Router);

  protected readonly suppliers  = signal<InvoiceSupplier[]>([]);
  protected readonly warehouses = signal<InvoiceWarehouse[]>([]);
  protected readonly saving     = signal(false);

  protected readonly lines = signal<InvoiceLineForm[]>([
    { productName: '', qty: 1, unitPrice: 0, discountPct: 0, total: 0 },
  ]);

  protected readonly paidNow = signal(0);

  protected readonly form = this.fb.nonNullable.group({
    supplierId:    [''],
    invoiceNumber: [''],
    date:          [new Date().toISOString().slice(0, 10)],
    dueDate:       [''],
    warehouseId:   [''],
    paymentMethod: ['' as InvoicePaymentMethod | ''],
    notes:         [''],
    updateStock:   [true],
  });

  protected readonly paymentMethods: InvoicePaymentMethod[] = ['نقدي', 'تحويل', 'مدى', 'STC Pay', 'آجل'];

  // ── Computed summary ────────────────────────────────────────────────────────
  protected readonly subtotal = computed(() =>
    this.lines().reduce((s, l) => s + l.qty * l.unitPrice, 0)
  );

  protected readonly discountTotal = computed(() =>
    this.lines().reduce((s, l) => s + l.qty * l.unitPrice * l.discountPct / 100, 0)
  );

  protected readonly afterDiscount = computed(() => this.subtotal() - this.discountTotal());

  protected readonly vatAmount = computed(() => this.afterDiscount() * 0.15);

  protected readonly grandTotal = computed(() => this.afterDiscount() + this.vatAmount());

  protected readonly remaining = computed(() => Math.max(0, this.grandTotal() - this.paidNow()));

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.svc.getSuppliers().subscribe(s => this.suppliers.set(s));
    this.svc.getWarehouses().subscribe(w => this.warehouses.set(w));
  }

  // ── Lines management ────────────────────────────────────────────────────────
  protected addLine(): void {
    this.lines.update(ls => [...ls, { productName: '', qty: 1, unitPrice: 0, discountPct: 0, total: 0 }]);
  }

  protected removeLine(idx: number): void {
    if (this.lines().length === 1) return;
    this.lines.update(ls => ls.filter((_, i) => i !== idx));
  }

  protected updateLine(idx: number, field: keyof InvoiceLineForm, rawValue: string): void {
    this.lines.update(ls => {
      const updated = [...ls];
      const line = { ...updated[idx] };
      if (field === 'productName') {
        line.productName = rawValue;
      } else {
        const num = Number(rawValue) || 0;
        if (field === 'qty')         line.qty         = num;
        if (field === 'unitPrice')   line.unitPrice   = num;
        if (field === 'discountPct') line.discountPct = num;
        line.total = line.qty * line.unitPrice * (1 - line.discountPct / 100);
      }
      updated[idx] = line;
      return updated;
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  protected save(): void {
    const fv = this.form.getRawValue();
    const supplier = this.suppliers().find(s => s.id === fv.supplierId);
    const warehouse = this.warehouses().find(w => w.id === fv.warehouseId);
    const paid    = this.paidNow();
    const total   = this.grandTotal();
    const status: InvoiceStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    this.saving.set(true);
    this.svc.create({
      invoiceNumber:  fv.invoiceNumber || `INV-${Date.now()}`,
      supplierName:   supplier?.name ?? '',
      date:           fv.date,
      dueDate:        fv.dueDate || undefined,
      warehouseName:  warehouse?.name,
      paymentMethod:  fv.paymentMethod || undefined,
      lines:          this.lines().map(l => ({
        productName: l.productName, qty: l.qty, unitPrice: l.unitPrice,
        discount: l.qty * l.unitPrice * l.discountPct / 100, total: l.total,
      })),
      itemsCount:     this.lines().reduce((s, l) => s + l.qty, 0),
      subtotal:       this.subtotal(),
      discountAmount: this.discountTotal(),
      vatAmount:      this.vatAmount(),
      total,
      paid,
      remaining:      this.remaining(),
      status,
      notes:          fv.notes || undefined,
    }).subscribe({
      next: () => {
        this.toast.success('تم حفظ الفاتورة بنجاح');
        this.router.navigate(['/invoices/list']);
      },
      error: () => { this.saving.set(false); this.toast.error('حدث خطأ أثناء الحفظ'); },
    });
  }
}
