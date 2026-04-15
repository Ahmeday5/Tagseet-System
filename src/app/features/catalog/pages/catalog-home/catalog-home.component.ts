import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { CatalogService } from '../../services/catalog.service';
import { CartItem, InstallmentPeriod, PendingOrder, Product } from '../../models/catalog.model';

@Component({
  selector: 'app-catalog-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe],
  templateUrl: './catalog-home.component.html',
  styleUrl: './catalog-home.component.scss',
})
export class CatalogHomeComponent implements OnInit {
  private readonly svc   = inject(CatalogService);
  private readonly toast = inject(ToastService);

  protected readonly products       = signal<Product[]>([]);
  protected readonly pendingOrders  = signal<PendingOrder[]>([]);
  protected readonly cart           = signal<CartItem[]>([]);

  // Customer form fields
  protected readonly customerName   = signal('');
  protected readonly customerPhone  = signal('');
  protected readonly downPayment    = signal(0);
  protected readonly profitRate     = signal(20);
  protected readonly installCount   = signal(12);
  protected readonly period         = signal<InstallmentPeriod>('شهري');

  // ── Computed ─────────────────────────────────────────────────────────────────
  protected readonly totalCart = computed(() =>
    this.cart().reduce((s, item) => s + item.product.price * item.qty, 0)
  );

  protected readonly afterDown = computed(() =>
    Math.max(0, this.totalCart() - this.downPayment())
  );

  protected readonly profitAmount = computed(() =>
    this.afterDown() * (this.profitRate() / 100)
  );

  protected readonly grandTotal = computed(() =>
    this.afterDown() + this.profitAmount()
  );

  protected readonly installmentAmount = computed(() => {
    const count = this.installCount();
    return count > 0 ? this.grandTotal() / count : 0;
  });

  protected readonly margin = (p: Product) => p.price - p.costPrice;

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.svc.getAll().subscribe(p => this.products.set(p));
    this.svc.getPendingOrders().subscribe(o => this.pendingOrders.set(o));
  }

  // ── Cart ─────────────────────────────────────────────────────────────────────
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

  protected createOrder(): void {
    if (!this.customerName()) { this.toast.warning('أدخل اسم العميل'); return; }
    if (!this.customerPhone()) { this.toast.warning('أدخل رقم جوال العميل'); return; }
    this.toast.success('تم إنشاء الطلبية بنجاح وإرسالها للعميل!');
    this.clearCart();
    this.customerName.set('');
    this.customerPhone.set('');
  }

  // ── Pending orders ────────────────────────────────────────────────────────────
  protected convertOrder(order: PendingOrder): void {
    this.svc.convertToContract(order.id).subscribe(() => {
      this.pendingOrders.update(os => os.filter(o => o.id !== order.id));
      this.toast.success(`تم تحويل طلب ${order.customerName} إلى عقد`);
    });
  }

  protected rejectOrder(order: PendingOrder): void {
    this.svc.rejectOrder(order.id).subscribe(() => {
      this.pendingOrders.update(os => os.filter(o => o.id !== order.id));
      this.toast.info(`تم رفض طلب ${order.customerName}`);
    });
  }
}
