import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { InvoicesService } from '../../services/invoices.service';
import {
  CreatePurchaseInvoicePayload,
  PurchaseInvoice,
} from '../../models/invoice.model';
import { Warehouse } from '../../../warehouse/models/warehouse.model';
import { WarehouseService } from '../../../warehouse/services/warehouse.service';
import { Product } from '../../../products/models/product.model';
import { ProductsService } from '../../../products/services/products.service';
import { Supplier } from '../../../suppliers/models/supplier.model';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { Treasury } from '../../../treasury/models/treasury.model';
import { TreasuryService } from '../../../treasury/services/treasury.service';

interface LineFormShape {
  productId: FormControl<number>;
  unitPrice: FormControl<number>;
  quantity: FormControl<number>;
  discountPercent: FormControl<number>;
}

const DEFAULT_TAX_RATE = 15;

@Component({
  selector: 'app-invoice-new',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CurrencyArPipe],
  templateUrl: './invoice-new.component.html',
  styleUrl: './invoice-new.component.scss',
})
export class InvoiceNewComponent implements OnInit {
  private readonly fb               = inject(FormBuilder);
  private readonly svc              = inject(InvoicesService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly productsService  = inject(ProductsService);
  private readonly treasuryService  = inject(TreasuryService);
  private readonly toast            = inject(ToastService);
  private readonly router           = inject(Router);

  // ── data ──
  protected readonly suppliers  = signal<Supplier[]>([]);
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly products   = signal<Product[]>([]);
  protected readonly treasuries = signal<Treasury[]>([]);
  protected readonly loadingRefs = signal(false);

  protected readonly activeWarehouses = computed(() =>
    this.warehouses().filter((w) => w.isActive),
  );
  protected readonly activeProducts = computed(() =>
    this.products().filter((p) => p.isActive),
  );
  protected readonly activeTreasuries = computed(() =>
    this.treasuries().filter((t) => t.isActive),
  );

  // ── submit state ──
  protected readonly savingDraft = signal(false);
  protected readonly savingFinal = signal(false);
  protected readonly serverError = signal<string | null>(null);

  /** Bumps every time a line input changes — triggers summary recompute. */
  private readonly linesTick = signal(0);

  // ── form ──
  protected readonly form = this.fb.nonNullable.group({
    supplierId:   [0, [Validators.required, Validators.min(1)]],
    warehouseId:  [0, [Validators.required, Validators.min(1)]],
    treasuryId:   [0, [Validators.required, Validators.min(1)]],
    invoiceDate:  [this.todayISO(), [Validators.required]],
    dueDate:      [this.plusDaysISO(30), [Validators.required]],
    taxRatePercent: [DEFAULT_TAX_RATE, [Validators.required, Validators.min(0), Validators.max(100)]],
    paidAmount:   [0, [Validators.required, Validators.min(0)]],
    notes:        [''],
    autoPostInventory: [true],
    items:        this.fb.array<FormGroup<LineFormShape>>([], Validators.minLength(1)),
  });

  protected get items(): FormArray<FormGroup<LineFormShape>> {
    return this.form.controls.items;
  }

  // ── computed summary ──
  protected readonly subtotal = computed(() => {
    this.linesTick(); // dependency
    return this.items.controls.reduce((sum, ctrl) => {
      const { quantity, unitPrice } = ctrl.getRawValue();
      return sum + (Number(quantity) || 0) * (Number(unitPrice) || 0);
    }, 0);
  });

  protected readonly discountAmount = computed(() => {
    this.linesTick();
    return this.items.controls.reduce((sum, ctrl) => {
      const { quantity, unitPrice, discountPercent } = ctrl.getRawValue();
      const lineGross = (Number(quantity) || 0) * (Number(unitPrice) || 0);
      return sum + lineGross * ((Number(discountPercent) || 0) / 100);
    }, 0);
  });

  protected readonly afterDiscount = computed(() =>
    Math.max(0, this.subtotal() - this.discountAmount()),
  );

  protected readonly taxAmount = computed(() => {
    const rate = Number(this.form.controls.taxRatePercent.value) || 0;
    return this.afterDiscount() * (rate / 100);
  });

  protected readonly grandTotal = computed(() =>
    this.afterDiscount() + this.taxAmount(),
  );

  protected readonly remaining = computed(() =>
    Math.max(0, this.grandTotal() - (Number(this.form.controls.paidAmount.value) || 0)),
  );

  protected readonly canSubmit = computed(() =>
    this.form.valid && this.items.length > 0,
  );

  // ─────────── lifecycle ───────────

  ngOnInit(): void {
    this.loadingRefs.set(true);
    this.suppliersService.listAll().subscribe({
      next: (s) => this.suppliers.set(s),
      error: () => this.suppliers.set([]),
    });
    this.warehouseService.list().subscribe({
      next: (w) => this.warehouses.set(w ?? []),
      error: () => this.warehouses.set([]),
    });
    this.productsService.listAll().subscribe({
      next: (p) => this.products.set(p),
      error: () => this.products.set([]),
    });
    this.treasuryService.list().subscribe({
      next: (t) => {
        this.treasuries.set(t);
        // Pre-select the first active treasury so the user doesn't have
        // to scroll the select before the form is valid.
        const first = t.find((tr) => tr.isActive);
        if (first && this.form.controls.treasuryId.value === 0) {
          this.form.controls.treasuryId.setValue(first.id);
        }
        this.loadingRefs.set(false);
      },
      error: () => {
        this.treasuries.set([]);
        this.loadingRefs.set(false);
      },
    });

    // Reactive recompute: form-level changes (taxRate / paid) feed the
    // summary computeds via signals; the FormArray's per-line controls
    // bump `linesTick` from updateLine() since FormArray itself isn't
    // signal-aware.
    this.form.controls.taxRatePercent.valueChanges.subscribe(() =>
      this.linesTick.update((v) => v + 1),
    );
    this.form.controls.paidAmount.valueChanges.subscribe(() =>
      this.linesTick.update((v) => v + 1),
    );

    // Start with one blank row.
    this.addLine();
  }

  // ─────────── line management ───────────

  protected addLine(): void {
    this.items.push(
      this.fb.group<LineFormShape>({
        productId:       this.fb.nonNullable.control(0, [Validators.required, Validators.min(1)]),
        unitPrice:       this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
        quantity:        this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
        discountPercent: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0), Validators.max(100)]),
      }),
    );
    this.linesTick.update((v) => v + 1);
  }

  protected removeLine(idx: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(idx);
    this.linesTick.update((v) => v + 1);
  }

  /**
   * Reads the picked product straight from the form control (which
   * `formControlName` already synced). Reading `$event.target.value`
   * here would NOT work — with `[ngValue]` Angular sets each option's
   * DOM value to an encoded string like `"1: 1"`, not the raw id, so
   * `Number(...)` would land on `NaN` and break both the model and the
   * select's display text.
   *
   * Side effect: when the user picks a product and the unit price is
   * still at the default 0, default it to the product's `purchasePrice`
   * so they don't have to retype it.
   */
  protected onProductChange(idx: number): void {
    const ctrl = this.items.at(idx);
    const productId = ctrl.controls.productId.value;
    const product = this.products().find((p) => p.id === productId);
    if (product && (Number(ctrl.controls.unitPrice.value) || 0) === 0) {
      ctrl.controls.unitPrice.setValue(product.purchasePrice ?? 0);
    }
    this.linesTick.update((v) => v + 1);
  }

  protected onLineFieldChange(idx: number, field: keyof LineFormShape, raw: string): void {
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    this.items.at(idx).controls[field].setValue(num);
    this.linesTick.update((v) => v + 1);
  }

  protected lineTotal(idx: number): number {
    const ctrl = this.items.at(idx);
    const { quantity, unitPrice, discountPercent } = ctrl.getRawValue();
    const gross = (Number(quantity) || 0) * (Number(unitPrice) || 0);
    return gross * (1 - (Number(discountPercent) || 0) / 100);
  }

  // ─────────── submit ───────────

  protected saveDraft(): void {
    this.submit(true);
  }

  protected saveAndConfirm(): void {
    this.submit(false);
  }

  private submit(asDraft: boolean): void {
    if (this.savingDraft() || this.savingFinal()) return;
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      this.toast.warning('أكمل بيانات الفاتورة الناقصة');
      return;
    }

    const raw = this.form.getRawValue();
    // Tax: the business rule is "default to 15% unless the user explicitly
    // sets another non-zero value". Empty string, null, or 0 → 15.
    const enteredTax = Number(raw.taxRatePercent);
    const taxRatePercent =
      Number.isFinite(enteredTax) && enteredTax > 0 ? enteredTax : DEFAULT_TAX_RATE;

    const payload: CreatePurchaseInvoicePayload = {
      supplierId:        Number(raw.supplierId),
      warehouseId:       Number(raw.warehouseId),
      invoiceDate:       this.toIso(raw.invoiceDate),
      dueDate:           this.toIso(raw.dueDate),
      taxRatePercent,
      paidAmount:        Number(raw.paidAmount) || 0,
      treasuryId:        Number(raw.treasuryId) || null,
      isDraft:           asDraft,
      autoPostInventory: !!raw.autoPostInventory,
      notes:             (raw.notes ?? '').trim(),
      items: raw.items.map((line) => ({
        productId:       Number(line.productId),
        quantity:        Number(line.quantity) || 0,
        unitPrice:       Number(line.unitPrice) || 0,
        discountPercent: Number(line.discountPercent) || 0,
      })),
    };

    this.serverError.set(null);
    if (asDraft) this.savingDraft.set(true);
    else this.savingFinal.set(true);

    this.svc.create(payload).subscribe({
      next: (res: PurchaseInvoice) => {
        this.savingDraft.set(false);
        this.savingFinal.set(false);
        this.toast.success(
          asDraft
            ? `تم حفظ المسودة ${res.invoiceNumber}`
            : `تم إنشاء الفاتورة ${res.invoiceNumber}`,
        );
        this.router.navigate(['/invoices/list']);
      },
      error: (err: ApiError) => {
        this.savingDraft.set(false);
        this.savingFinal.set(false);
        this.serverError.set(err.message || 'تعذّر حفظ الفاتورة');
      },
    });
  }

  // ─────────── helpers ───────────

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private plusDaysISO(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  /** Converts a `YYYY-MM-DD` value to a midday-UTC ISO string. */
  private toIso(value: string): string {
    if (!value) return new Date().toISOString();
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime())
      ? new Date().toISOString()
      : d.toISOString();
  }
}
