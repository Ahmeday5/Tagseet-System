import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ProductsService } from '../../services/products.service';
import { Product } from '../../models/product.model';
import { ProductFormModalComponent } from '../../components/product-form-modal/product-form-modal.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { FormMode } from '../../../../shared/models/form-mode.model';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { buildImageUrl } from '../../utils/product-image.util';

/**
 * Products listing page.
 *
 *   - hero summary: total / active / inactive / total inventory cost
 *   - card grid: one card per product with image, prices, profit, status
 *   - CRUD: create / edit / delete via the form modal + confirm dialog
 *   - mutations update local state optimistically; cache invalidation
 *     in the service handles the next list refresh.
 */
@Component({
  selector: 'app-products-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProductFormModalComponent, CurrencyArPipe],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss',
})
export class ProductsListComponent implements OnInit {
  private readonly service = inject(ProductsService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  // ── data ──
  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(false);

  // ── modal state ──
  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<FormMode>('create');
  protected readonly modalProduct = signal<Product | null>(null);

  /** Tracks which card is currently being deleted, for inline button state. */
  protected readonly deletingId = signal<number | null>(null);

  // ── derived ──
  protected readonly hasProducts = computed(() => this.products().length > 0);
  protected readonly totalCount = computed(() => this.products().length);
  protected readonly activeCount = computed(
    () => this.products().filter((p) => p.isActive).length,
  );
  protected readonly inactiveCount = computed(
    () => this.totalCount() - this.activeCount(),
  );

  /** Total inventory cost = Σ purchasePrice (one unit each — actual stock comes from warehouses). */
  protected readonly totalInventoryCost = computed(() =>
    this.products().reduce((sum, p) => sum + (p.purchasePrice ?? 0), 0),
  );

  ngOnInit(): void {
    this.loadProducts();
  }

  // ─────────────── data loading ───────────────

  protected loadProducts(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (list) => {
        this.products.set(list ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ─────────────── modal handlers ───────────────

  protected openCreate(): void {
    this.modalProduct.set(null);
    this.modalMode.set('create');
    this.modalOpen.set(true);
  }

  protected openEdit(product: Product): void {
    this.modalProduct.set(product);
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected onSaved(saved: Product): void {
    const wasCreate = this.modalMode() === 'create';
    this.products.update((list) =>
      wasCreate
        ? [saved, ...list]
        : list.map((p) => (p.id === saved.id ? saved : p)),
    );
    this.modalOpen.set(false);
  }

  // ─────────────── delete ───────────────

  protected async confirmDelete(product: Product): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'حذف منتج',
      message: `هل أنت متأكد من حذف "${product.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (!ok) return;

    this.deletingId.set(product.id);
    this.service.delete(product.id).subscribe({
      next: (res) => {
        this.products.update((list) =>
          list.filter((p) => p.id !== product.id),
        );
        this.deletingId.set(null);
        this.toast.success(res?.message || 'تم حذف المنتج');
      },
      error: (_err: ApiError) => this.deletingId.set(null),
    });
  }

  // ─────────────── view helpers ───────────────

  protected imageOf(product: Product): string | null {
    return buildImageUrl(product.imageUrl);
  }

  protected profitOf(product: Product): number {
    return (product.sellingPrice ?? 0) - (product.purchasePrice ?? 0);
  }

  protected marginPctOf(product: Product): number {
    const cost = product.purchasePrice ?? 0;
    if (cost <= 0) return 0;
    return Math.round((this.profitOf(product) / cost) * 100);
  }

  /** Hide a broken image so the placeholder takes over. */
  protected onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
