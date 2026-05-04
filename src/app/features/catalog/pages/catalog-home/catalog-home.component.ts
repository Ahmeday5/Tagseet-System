import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { CatalogService } from '../../services/catalog.service';
import {
  CartItem,
  ClientOrder,
  ClientOrderItem,
  InstallmentPeriod,
  Product,
} from '../../models/catalog.model';
import { ConvertToContractModalComponent } from '../../components/convert-to-contract-modal/convert-to-contract-modal.component';

interface InstallmentRow {
  index: number;
  amount: number;
}

@Component({
  selector: 'app-catalog-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe, ConvertToContractModalComponent],
  templateUrl: './catalog-home.component.html',
  styleUrl: './catalog-home.component.scss',
})
export class CatalogHomeComponent implements OnInit {
  private readonly svc    = inject(CatalogService);
  private readonly toast  = inject(ToastService);
  private readonly dialog = inject(DialogService);

  // ── data ──
  protected readonly products       = signal<Product[]>([]);
  protected readonly clientOrders   = signal<ClientOrder[]>([]);
  protected readonly cart           = signal<CartItem[]>([]);
  protected readonly searchTerm     = signal('');
  protected readonly loadingOrders  = signal(false);
  protected readonly rejectingId    = signal<number | null>(null);

  // ── manual order form ──
  protected readonly customerName   = signal('');
  protected readonly customerPhone  = signal('');
  protected readonly downPayment    = signal(0);
  protected readonly profitRate     = signal(20);
  protected readonly installCount   = signal(12);
  protected readonly period         = signal<InstallmentPeriod>('شهري');

  // ── convert modal state ──
  protected readonly convertModalOpen = signal(false);
  protected readonly convertOrderRef  = signal<ClientOrder | null>(null);

  // ── derived ──
  protected readonly pendingOrders = computed(() =>
    this.clientOrders().filter((o) => o.status === 'Pending'),
  );

  protected readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.products();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.warehouseName ?? '').toLowerCase().includes(term),
    );
  });

  protected readonly cashTotal = computed(() =>
    this.cart().reduce((s, item) => s + item.product.price * item.qty, 0),
  );

  protected readonly profitAmount = computed(() => {
    const base = Math.max(0, this.cashTotal() - this.downPayment());
    return base * (this.profitRate() / 100);
  });

  protected readonly grandTotal = computed(() =>
    Math.max(0, this.cashTotal() - this.downPayment()) + this.profitAmount(),
  );

  protected readonly installmentAmount = computed(() => {
    const count = this.installCount();
    return count > 0 ? this.grandTotal() / count : 0;
  });

  protected readonly installmentLabel = computed(() =>
    `القسط ${this.period()} × ${this.installCount()}`,
  );

  protected readonly schedule = computed<InstallmentRow[]>(() => {
    const count = this.installCount();
    const amount = this.installmentAmount();
    if (count <= 0 || amount <= 0) return [];
    return Array.from({ length: count }, (_, i) => ({ index: i + 1, amount }));
  });

  protected readonly margin = (p: Product) => {
    if (!p.costPrice) return 0;
    return Math.round(((p.price - p.costPrice) / p.costPrice) * 100);
  };

  // ─────────── lifecycle ───────────

  ngOnInit(): void {
    this.svc.getAll().subscribe((p) => this.products.set(p));
    this.loadClientOrders();
  }

  // ─────────── client orders ───────────

  protected loadClientOrders(force = false): void {
    this.loadingOrders.set(true);
    const stream$ = force
      ? this.svc.refreshClientOrders()
      : this.svc.listClientOrders();
    stream$.subscribe({
      next: (list) => {
        this.clientOrders.set(list ?? []);
        this.loadingOrders.set(false);
      },
      error: () => {
        this.clientOrders.set([]);
        this.loadingOrders.set(false);
      },
    });
  }

  protected openConvertModal(order: ClientOrder): void {
    this.convertOrderRef.set(order);
    this.convertModalOpen.set(true);
  }

  protected closeConvertModal(): void {
    this.convertModalOpen.set(false);
  }

  protected onConverted(order: ClientOrder): void {
    this.convertModalOpen.set(false);
    // Optimistically drop the converted order from the list — the cache
    // was also invalidated in the service, so a manual refresh is honest.
    this.clientOrders.update((list) =>
      list.map((o) =>
        o.id === order.id ? { ...o, status: 'Converted' } : o,
      ),
    );
  }

  protected async confirmReject(order: ClientOrder): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'رفض الطلب',
      message: `هل أنت متأكد من رفض طلب ${order.clientName}؟`,
      confirmText: 'رفض',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (!ok) return;

    this.rejectingId.set(order.id);
    this.svc.rejectClientOrder(order.id).subscribe({
      next: (res) => {
        this.rejectingId.set(null);
        this.clientOrders.update((list) =>
          list.map((o) =>
            o.id === order.id ? { ...o, status: 'Rejected' } : o,
          ),
        );
        this.toast.success(res?.message || `تم رفض طلب ${order.clientName}`);
      },
      error: (err: ApiError) => {
        this.rejectingId.set(null);
        this.toast.error(err.message || 'فشل رفض الطلب — حاول مرة أخرى');
      },
    });
  }

  // ─────────── display helpers ───────────

  protected orderRowClass(order: ClientOrder): string {
    switch (order.status) {
      case 'Pending':   return 'ord-pending-row';
      case 'Rejected':  return 'ord-rejected-row';
      case 'Converted': return 'ord-converted-row';
      default:          return '';
    }
  }

  protected itemsLabel(items: ClientOrderItem[]): string {
    if (!items || items.length === 0) return '—';
    return items.map((i) => `${i.productName} × ${i.quantity}`).join(' + ');
  }

  /**
   * Renders the API's `orderDate` (ISO) in a friendly Arabic relative
   * format: "اليوم 10:15 ص" / "أمس 6:20 م" / full date for older.
   */
  protected formatOrderDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';

    const time = this.formatArabicTime(d);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDay(d, today)) return `اليوم ${time}`;
    if (this.isSameDay(d, yesterday)) return `أمس ${time}`;
    return d.toLocaleDateString('ar-SA');
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private formatArabicTime(d: Date): string {
    const hours24 = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const period = hours24 >= 12 ? 'م' : 'ص';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12}:${minutes} ${period}`;
  }

  // ─────────── manual cart (mock products) ───────────

  protected onSearch(value: string): void { this.searchTerm.set(value); }

  protected addToCart(product: Product): void {
    const existing = this.cart().find(i => i.product.id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) { this.toast.warning(`الكمية المتاحة ${product.stock} فقط`); return; }
      this.cart.update(items => items.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      this.cart.update(items => [...items, { product, qty: 1 }]);
    }
  }

  protected changeQty(index: number, delta: number): void {
    const item = this.cart()[index];
    const newQty = item.qty + delta;
    if (newQty < 1)                  { this.removeItem(index); return; }
    if (newQty > item.product.stock) { this.toast.warning('تجاوزت الكمية المتاحة'); return; }
    this.cart.update(items => items.map((it, i) => i === index ? { ...it, qty: newQty } : it));
  }

  protected removeItem(index: number): void {
    this.cart.update(items => items.filter((_, i) => i !== index));
  }

  protected clearCart(): void { this.cart.set([]); }

  protected createContract(): void {
    if (this.cart().length === 0) { this.toast.warning('السلة فارغة — أضف أصنافًا أولاً'); return; }
    if (!this.customerName())     { this.toast.warning('أدخل اسم العميل'); return; }
    if (!this.customerPhone())    { this.toast.warning('أدخل رقم الجوال'); return; }
    this.toast.success('تم إنشاء العقد بنجاح');
  }

  protected sendWhatsapp(): void {
    if (!this.customerPhone()) { this.toast.warning('أدخل رقم الجوال أولاً'); return; }
    this.toast.info('تم إرسال تفاصيل العقد على واتساب');
  }
}
