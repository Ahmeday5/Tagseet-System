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
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { LookupItem } from '../../../../core/models/lookup.model';

import { InvoicesService } from '../../../invoices/services/invoices.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { TreasuryService } from '../../../treasury/services/treasury.service';
import {
  CreateDirectPurchaseInvoicePayload,
  PurchaseInvoice,
} from '../../../invoices/models/invoice.model';

interface LineFormShape {
  productName: FormControl<string>;
  quantity: FormControl<number | null>;
  unitPrice: FormControl<number | null>;
  discountAmount: FormControl<number | null>;
}

/**
 * Quick "add supplier invoice" surface embedded inside the direct-contract
 * modal — wraps `POST /dashboard/supplier-purchase-invoices/direct`, the
 * free-text sibling of the regular (warehouse-linked) purchase invoice.
 *
 * Deliberately mirrors the direct *contract*'s own item shape (free-text
 * `productName`, no `productId`/`warehouseId`) rather than the full
 * invoice-new page: a direct contract never touches the product catalog or
 * inventory, so the invoice recorded behind it shouldn't either. No
 * draft/confirm step exists for this endpoint — every direct invoice is
 * final on save.
 *
 * On success, emits the created invoice; the parent maps its lines into
 * the direct-contract's own item rows and pre-fills the supplier.
 */
@Component({
  selector: 'app-supplier-invoice-quick-add-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
    CurrencyArPipe,
  ],
  templateUrl: './supplier-invoice-quick-add-modal.component.html',
  styleUrl: './supplier-invoice-quick-add-modal.component.scss',
})
export class SupplierInvoiceQuickAddModalComponent {
  // ── inputs / outputs ──
  readonly open = input.required<boolean>();
  /** Pre-selects the supplier when the caller already knows it. */
  readonly supplierId = input<number | null>(null);

  readonly closed = output<void>();
  readonly created = output<PurchaseInvoice>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(InvoicesService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly toast = inject(ToastService);

  // ── lookups ──
  protected readonly suppliers = signal<LookupItem[]>([]);
  protected readonly treasuries = signal<LookupItem[]>([]);
  protected readonly loadingRefs = signal(false);
  private lookupsLoaded = false;

  protected readonly supplierOptions = computed<SearchableSelectOption[]>(() =>
    this.suppliers().map((s) => ({ value: s.id, label: s.name })),
  );
  protected readonly treasuryOptions = computed<SearchableSelectOption[]>(() =>
    this.treasuries().map((t) => ({ value: t.id, label: t.name })),
  );

  // ── submit state ──
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  // ── form ──
  protected readonly form = this.fb.nonNullable.group({
    supplierId: this.fb.control<number | null>(null, [Validators.required]),
    treasuryId: this.fb.control<number | null>(null),
    invoiceDate: [this.todayISO(), [Validators.required]],
    dueDate: [''],
    paidAmount: [0, [Validators.required, Validators.min(0)]],
    notes: [''],
    items: this.fb.array<FormGroup<LineFormShape>>([this.createItemGroup()]),
  });

  protected get items(): FormArray<FormGroup<LineFormShape>> {
    return this.form.controls.items;
  }

  /**
   * Bumps on every line-field change and on `paidAmount` changes (wired in
   * the constructor). The summary computeds below read plain `FormArray`/
   * `FormControl` values — invisible to signal dependency tracking on their
   * own — so each one calls `this.linesTick()` first purely to register a
   * tracked dependency that forces a recompute.
   */
  private readonly linesTick = signal(0);

  // ── computed summary ──
  protected readonly subtotal = computed(() => {
    this.linesTick();
    return this.items.controls.reduce((sum, ctrl) => {
      const { quantity, unitPrice } = ctrl.getRawValue();
      return sum + (Number(quantity) || 0) * (Number(unitPrice) || 0);
    }, 0);
  });

  protected readonly discountAmount = computed(() => {
    this.linesTick();
    return this.items.controls.reduce((sum, ctrl) => {
      const { discountAmount } = ctrl.getRawValue();
      return sum + (Number(discountAmount) || 0);
    }, 0);
  });

  protected readonly grandTotal = computed(() =>
    Math.max(0, this.subtotal() - this.discountAmount()),
  );

  protected readonly remaining = computed(() => {
    this.linesTick();
    return Math.max(0, this.grandTotal() - (Number(this.form.controls.paidAmount.value) || 0));
  });

  protected readonly canSubmit = computed(() => this.form.valid && this.items.length > 0);

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        this.resetForNewOpen();
        if (!this.lookupsLoaded) this.loadLookups();
      },
      { allowSignalWrites: true },
    );

    this.form.controls.paidAmount.valueChanges.subscribe(() =>
      this.linesTick.update((v) => v + 1),
    );
  }

  // ─────────── lookups ───────────

  private loadLookups(): void {
    this.lookupsLoaded = true;
    this.loadingRefs.set(true);

    forkJoin({
      suppliers: this.suppliersService.lookup().pipe(catchError(() => of([] as LookupItem[]))),
      treasuries: this.treasuryService.lookup().pipe(catchError(() => of([] as LookupItem[]))),
    })
      .pipe(finalize(() => this.loadingRefs.set(false)))
      .subscribe({
        next: (res) => {
          this.suppliers.set(res.suppliers);
          this.treasuries.set(res.treasuries);
          this.applyPendingSupplier();
        },
        error: () => this.toast.error('حدث خطأ أثناء تحميل بيانات الفاتورة'),
      });
  }

  private applyPendingSupplier(): void {
    const id = this.supplierId();
    if (id && !this.form.controls.supplierId.value) {
      this.form.controls.supplierId.setValue(id);
    }
  }

  // ─────────── line management ───────────

  private createItemGroup(): FormGroup<LineFormShape> {
    return this.fb.group<LineFormShape>({
      productName: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
      quantity: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
      unitPrice: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
      discountAmount: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
    });
  }

  protected addLine(): void {
    this.items.push(this.createItemGroup());
    this.linesTick.update((v) => v + 1);
  }

  protected removeLine(idx: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(idx);
    this.linesTick.update((v) => v + 1);
  }

  protected onLineFieldChange(
    idx: number,
    field: 'unitPrice' | 'quantity' | 'discountAmount',
    raw: string,
  ): void {
    const num = Number(raw);
    if (Number.isNaN(num)) return;

    const ctrl = this.items.at(idx);
    ctrl.get(field)?.setValue(num);

    // A line's discount can never exceed its own gross (quantity*unitPrice).
    const { quantity, unitPrice, discountAmount } = ctrl.getRawValue();
    const maxDiscount = (Number(quantity) || 0) * (Number(unitPrice) || 0);
    const clamped = Math.min(Math.max(Number(discountAmount) || 0, 0), maxDiscount);
    if (clamped !== discountAmount) {
      ctrl.get('discountAmount')?.setValue(clamped);
    }

    this.linesTick.update((v) => v + 1);
  }

  protected lineTotal(idx: number): number {
    const ctrl = this.items.at(idx);
    const { quantity, unitPrice, discountAmount } = ctrl.getRawValue();
    const gross = (Number(quantity) || 0) * (Number(unitPrice) || 0);
    return Math.max(0, gross - (Number(discountAmount) || 0));
  }

  // ─────────── submit ───────────

  protected isInvalid(field: 'supplierId'): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      this.toast.warning('أكمل بيانات الفاتورة الناقصة');
      return;
    }

    const raw = this.form.getRawValue();
    const paidAmount = Number(raw.paidAmount) || 0;

    if (paidAmount > 0 && !raw.treasuryId) {
      this.toast.warning('اختر الخزنة عند تسجيل مبلغ مدفوع');
      return;
    }

    const payload: CreateDirectPurchaseInvoicePayload = {
      supplierId: Number(raw.supplierId),
      invoiceDate: this.toIso(raw.invoiceDate),
      dueDate: raw.dueDate ? this.toIso(raw.dueDate) : null,
      paidAmount,
      treasuryId: raw.treasuryId ? Number(raw.treasuryId) : null,
      notes: (raw.notes ?? '').trim() || null,
      items: raw.items.map((line) => ({
        productName: String(line.productName ?? '').trim(),
        quantity: Number(line.quantity) || 0,
        unitPrice: Number(line.unitPrice) || 0,
        discountAmount: Number(line.discountAmount) || 0,
      })),
    };

    this.serverError.set(null);
    this.submitting.set(true);

    this.svc
      .createDirect(payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (invoice) => {
          this.toast.success(`تم إنشاء فاتورة المشتريات ${invoice.invoiceNumber} بنجاح`);
          this.created.emit(invoice);
        },
        error: (err: ApiError) => {
          this.serverError.set(err.message || 'تعذّر حفظ فاتورة المشتريات');
        },
      });
  }

  protected close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  // ─────────── internals ───────────

  private resetForNewOpen(): void {
    this.serverError.set(null);
    this.submitting.set(false);
    while (this.items.length > 1) this.items.removeAt(1);
    this.items.at(0)?.reset({ productName: '', quantity: 1, unitPrice: 0, discountAmount: 0 });
    this.form.reset({
      supplierId: null,
      treasuryId: null,
      invoiceDate: this.todayISO(),
      dueDate: '',
      paidAmount: 0,
      notes: '',
    });
    this.linesTick.update((v) => v + 1);
    this.applyPendingSupplier();
  }

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toIso(value: string): string {
    if (!value) return new Date().toISOString();
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
}
