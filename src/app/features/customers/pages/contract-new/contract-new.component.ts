import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, finalize, of, catchError } from 'rxjs';

import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ContractPrintModalComponent } from '../../../contracts/components/contract-print-modal/contract-print-modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { AuthService } from '../../../../core/services/auth.service';
import { PERMISSIONS } from '../../../../core/constants/permissions.const';

import { ContractsService } from '../../../contracts/services/contracts.service';
import { CustomersService } from '../../services/customers.service';
import { ProductsService } from '../../../products/services/products.service';
import { WarehouseService } from '../../../warehouse/services/warehouse.service';
import { TreasuryService } from '../../../treasury/services/treasury.service';
import { RepsService } from '../../../reps/services/reps.service';

import {
  ContractFormState,
  ContractItem,
  ContractPaymentFrequency,
  UpdateContractFormState,
} from '../../../contracts/models/contract.model';
import { ContractDetails } from '../../models/client-statement.model';
import { DashboardClient } from '../../models/dashboard-client.model';
import { LookupItem } from '../../../../core/models/lookup.model';

export interface ItemBreakdown {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

@Component({
  selector: 'app-contract-new',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CurrencyArPipe,
    FormErrorComponent,
    LoaderComponent,
    SearchableSelectComponent,
    ContractPrintModalComponent,
  ],
  templateUrl: './contract-new.component.html',
  styleUrl: './contract-new.component.scss',
})
export class ContractNewComponent implements OnInit {
  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly contractsService = inject(ContractsService);
  private readonly customersService = inject(CustomersService);
  private readonly productsService = inject(ProductsService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly repsService = inject(RepsService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  // ── edit mode ──
  protected readonly editId = signal<number | null>(null);
  protected readonly isEditMode = computed(() => this.editId() !== null);

  // ── UI state ──
  protected readonly loading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly printContractId = signal<number | null>(null);

  // ── lookup data ──
  protected readonly clients = signal<DashboardClient[]>([]);
  protected readonly products = signal<LookupItem[]>([]);
  protected readonly warehouses = signal<LookupItem[]>([]);
  protected readonly treasuries = signal<LookupItem[]>([]);
  protected readonly representatives = signal<LookupItem[]>([]);

  protected readonly clientOptions = computed<SearchableSelectOption[]>(() =>
    this.clients().map((c) => ({ value: c.id, label: c.fullName, hint: c.phoneNumber })),
  );
  protected readonly productOptions = computed<SearchableSelectOption[]>(() =>
    this.products().map((p) => ({ value: p.id, label: p.name })),
  );
  protected readonly warehouseOptions = computed<SearchableSelectOption[]>(() =>
    this.warehouses().map((w) => ({ value: w.id, label: w.name })),
  );
  protected readonly treasuryOptions = computed<SearchableSelectOption[]>(() =>
    this.treasuries().map((t) => ({ value: t.id, label: t.name })),
  );
  protected readonly representativeOptions = computed<SearchableSelectOption[]>(() =>
    this.representatives().map((r) => ({ value: r.id, label: r.name })),
  );

  protected readonly frequencies: { value: ContractPaymentFrequency; label: string }[] = [
    { value: 'Monthly', label: 'شهري' },
    { value: 'Quarterly', label: 'ربع سنوي' },
    { value: 'SemiAnnual', label: 'نصف سنوي' },
  ];

  // ── prefill guard ──
  private prefilling = false;

  // ── form ──
  protected readonly form = this.fb.nonNullable.group({
    clientId: [null as number | null, [Validators.required]],
    items: this.fb.array([this.createItemGroup()]),
    dateOfSale: [this.todayStr(), [Validators.required]],
    cashPrice: [0, [Validators.required, Validators.min(1)]],
    downPayment: [0, [Validators.required, Validators.min(0)]],
    profitRate: [20, [Validators.required, Validators.min(0), Validators.max(100)]],
    installmentsCount: [12, [Validators.required, Validators.min(1), Validators.max(120)]],
    installmentAmount: [{ value: 0, disabled: true }],
    paymentFrequency: ['Monthly' as ContractPaymentFrequency, [Validators.required]],
    firstInstallmentDate: [this.nextMonthStr(), [Validators.required]],
    treasuryId: [null as number | null, [Validators.required]],
    representativeId: [null as number | null],
    notes: [''],
  });

  // ── reactive values for computed summary ──
  private readonly values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** Per-item breakdown: product name × qty × unit price. */
  protected readonly itemBreakdowns = computed<ItemBreakdown[]>(() => {
    this.values(); // subscribe to changes
    const prods = this.products();
    const result: ItemBreakdown[] = [];
    for (let i = 0; i < this.itemsArray.length; i++) {
      const group = this.itemsArray.at(i);
      const productId = Number(group.get('productId')?.value ?? 0);
      const qty = Math.max(1, Number(group.get('quantity')?.value ?? 1));
      const unitPrice = Number(group.get('sellPrice')?.value ?? 0);
      const name = prods.find((p) => p.id === productId)?.name ?? '—';
      result.push({ name, quantity: qty, unitPrice, subtotal: unitPrice * qty });
    }
    return result;
  });

  /** Total computed from item breakdowns (sum of unitPrice × qty). */
  protected readonly computedTotal = computed(() =>
    this.itemBreakdowns().reduce((s, b) => s + b.subtotal, 0),
  );

  protected readonly summary = computed(() => {
    const v = this.values();
    const cashPrice = Number(v.cashPrice ?? 0);
    const downPayment = Number(v.downPayment ?? 0);
    const profitRate = Number(v.profitRate ?? 0);
    const count = Math.max(1, Number(v.installmentsCount ?? 1));
    const afterDown = Math.max(0, cashPrice - downPayment);
    const profitAmount = afterDown * (profitRate / 100);
    const totalAmount = afterDown + profitAmount;
    const installmentAmt = totalAmount / count;
    return { cashPrice, downPayment, afterDown, profitRate, profitAmount, totalAmount, installmentAmt, count };
  });

  // ── lifecycle ──
  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.queryParamMap.get('editId'));
    if (idParam) this.editId.set(idParam);
    this.loadLookups();
    this.form.valueChanges.subscribe(() => this.calculateInstallment());
    this.watchItemChanges(this.itemsArray.at(0) as FormGroup, 0);
  }

  // ─────────── FormArray ───────────

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  private createItemGroup(): FormGroup {
    return this.fb.nonNullable.group({
      productId: this.fb.control<number | null>(null, [Validators.required]),
      warehouseId: this.fb.control<number | null>(null, [Validators.required]),
      quantity: [1, [Validators.required, Validators.min(1)]],
      sellPrice: [0],
    });
  }

  protected addItem(): void {
    const group = this.createItemGroup();
    this.itemsArray.push(group);
    this.watchItemChanges(group, this.itemsArray.length - 1);
  }

  protected removeItem(index: number): void {
    if (this.itemsArray.length <= 1) return;
    this.itemsArray.removeAt(index);
    this.refreshTotal();
  }

  protected getItemControl(index: number, field: string): AbstractControl | null {
    return this.itemsArray.at(index)?.get(field) ?? null;
  }

  // ─────────── Lookups ───────────

  private loadLookups(): void {
    this.loading.set(true);
    const id = this.editId();

    forkJoin({
      clients: this.customersService.listAllClients().pipe(catchError(() => of([] as DashboardClient[]))),
      products: this.productsService.lookup().pipe(catchError(() => of([] as LookupItem[]))),
      warehouses: this.warehouseService.lookup().pipe(catchError(() => of([] as LookupItem[]))),
      treasuries: this.treasuryService.lookup().pipe(catchError(() => of([] as LookupItem[]))),
      reps: this.repsService.lookup().pipe(catchError(() => of([] as LookupItem[]))),
      details: id
        ? this.contractsService.getDetails(id).pipe(catchError(() => of(null as ContractDetails | null)))
        : of(null as ContractDetails | null),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.clients.set(res.clients);
          this.products.set(res.products);
          this.warehouses.set(res.warehouses);
          this.treasuries.set(res.treasuries);
          this.representatives.set(res.reps);
          if (res.details) this.prefillFromDetails(res.details);
        },
        error: () => this.toast.error('حدث خطأ أثناء تحميل البيانات'),
      });
  }

  private prefillFromDetails(d: ContractDetails): void {
    this.prefilling = true;

    while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);

    const sourceItems = d.items.length > 0
      ? d.items
      : [{ productId: null, warehouseId: null, quantity: 1, productName: '', warehouseName: null, purchasePrice: 0 }];

    sourceItems.forEach((item) => {
      const group = this.createItemGroup();
      group.patchValue({
        productId: item.productId,
        warehouseId: item.warehouseId,
        quantity: item.quantity,
        sellPrice: 0,
      });
      this.itemsArray.push(group);
      this.watchItemChanges(group, this.itemsArray.length - 1);
    });

    this.form.patchValue({
      clientId: d.client.id,
      dateOfSale: d.contract.dateOfSale.split('T')[0],
      cashPrice: d.contract.cashPrice,
      downPayment: d.contract.downPayment,
      profitRate: d.contract.profitRate,
      installmentsCount: d.contract.installmentsCount,
      paymentFrequency: d.contract.paymentFrequency as ContractPaymentFrequency,
      firstInstallmentDate: d.contract.firstInstallmentDate.split('T')[0],
      treasuryId: d.contract.treasuryId ?? null,
      representativeId: d.representative?.id ?? null,
      notes: d.contract.notes ?? '',
    });
    this.prefilling = false;
    this.form.get('installmentAmount')?.setValue(d.contract.installmentAmount, { emitEvent: false });
  }

  // ─────────── Calculations ───────────

  private watchItemChanges(group: FormGroup, index: number): void {
    // Watch quantity → refresh total
    group.get('quantity')?.valueChanges.subscribe(() => {
      if (!this.prefilling) this.refreshTotal();
    });

    // Watch product → fetch unit price, set on item, refresh total
    if (!this.auth.hasPermission(PERMISSIONS.suppliersView)) return;

    group.get('productId')?.valueChanges.subscribe((id) => {
      if (this.prefilling) return;
      const productId = Number(id);
      if (!productId) {
        group.get('sellPrice')?.setValue(0, { emitEvent: false });
        this.refreshTotal();
        return;
      }
      this.productsService.getById(productId).subscribe({
        next: (product) => {
          group.get('sellPrice')?.setValue(product.sellingPrice, { emitEvent: false });
          this.refreshTotal();
        },
        error: () => {
          group.get('sellPrice')?.setValue(0, { emitEvent: false });
        },
      });
    });
  }

  private refreshTotal(): void {
    let total = 0;
    let allKnown = true;
    for (let i = 0; i < this.itemsArray.length; i++) {
      const g = this.itemsArray.at(i);
      const price = Number(g.get('sellPrice')?.value ?? 0);
      const qty = Math.max(1, Number(g.get('quantity')?.value ?? 1));
      if (price <= 0) { allKnown = false; }
      total += price * qty;
    }
    if (allKnown && total > 0) {
      this.form.patchValue({ cashPrice: total }, { emitEvent: true });
    }
  }

  private calculateInstallment(): void {
    const cashPrice = Number(this.form.get('cashPrice')?.value ?? 0);
    const downPayment = Number(this.form.get('downPayment')?.value ?? 0);
    const profitRate = Number(this.form.get('profitRate')?.value ?? 0);
    const count = Math.max(1, Number(this.form.get('installmentsCount')?.value ?? 1));
    const remaining = cashPrice - downPayment;
    if (remaining <= 0) {
      this.form.get('installmentAmount')?.setValue(0, { emitEvent: false });
      return;
    }
    const totalWithProfit = remaining * (1 + profitRate / 100);
    this.form.get('installmentAmount')?.setValue(
      Number((totalWithProfit / count).toFixed(2)), { emitEvent: false },
    );
  }

  // ─────────── Submit ───────────

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error(this.firstInvalidFieldMessage() || 'يرجى تعبئة الحقول المطلوبة');
      return;
    }

    this.isSaving.set(true);
    const raw = this.form.getRawValue();
    const id = this.editId();

    const items: ContractItem[] = (raw.items as any[]).map((item) => ({
      productId: Number(item.productId),
      warehouseId: Number(item.warehouseId),
      quantity: Number(item.quantity),
    }));

    const sharedFields = {
      clientId: Number(raw.clientId),
      items,
      dateOfSale: new Date(raw.dateOfSale).toISOString(),
      cashPrice: Number(raw.cashPrice),
      downPayment: Number(raw.downPayment),
      profitRate: Number(raw.profitRate),
      installmentsCount: Number(raw.installmentsCount),
      installmentAmount: Number(raw.installmentAmount),
      paymentFrequency: raw.paymentFrequency as ContractPaymentFrequency,
      firstInstallmentDate: new Date(raw.firstInstallmentDate).toISOString(),
      treasuryId: Number(raw.treasuryId),
      representativeId: raw.representativeId ? Number(raw.representativeId) : null,
      notes: raw.notes?.trim() || '',
    };

    if (id) {
      const updateForm: UpdateContractFormState = sharedFields;
      this.contractsService
        .update(id, updateForm)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.toast.success('تم تعديل العقد بنجاح');
            this.router.navigate(['/customers/statement']);
          },
          error: (err: ApiError) => {
            this.toast.error(apiErrorToMessage(err, 'فشل في تعديل العقد'));
          },
        });
      return;
    }

    const payload: ContractFormState = sharedFields;

    this.contractsService
      .create(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (created) => {
          this.toast.success('تم إنشاء العقد بنجاح');
          this.printContractId.set(created.id);
        },
        error: (err: ApiError) => {
          this.toast.error(apiErrorToMessage(err, 'فشل في إنشاء العقد'));
        },
      });
  }

  // ─────────── Helpers ───────────

  protected closePrintModal(): void {
    this.printContractId.set(null);
    this.router.navigate(['/customers/customer-list']);
  }

  protected reset(): void {
    while (this.itemsArray.length > 1) this.itemsArray.removeAt(1);
    this.form.reset({
      clientId: null,
      dateOfSale: this.todayStr(),
      cashPrice: 0,
      downPayment: 0,
      profitRate: 20,
      installmentsCount: 12,
      installmentAmount: 0,
      paymentFrequency: 'Monthly',
      firstInstallmentDate: this.nextMonthStr(),
      treasuryId: null,
      representativeId: null,
      notes: '',
    });
    this.itemsArray.at(0)?.reset({ productId: null, warehouseId: null, quantity: 1, sellPrice: 0 });
  }

  protected isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!ctrl && ctrl.invalid && ctrl.touched;
  }

  private firstInvalidFieldMessage(): string | null {
    const labels: Record<string, string> = {
      clientId: 'العميل',
      dateOfSale: 'تاريخ البيع',
      cashPrice: 'السعر الكاش',
      downPayment: 'المقدم',
      profitRate: 'نسبة الربح',
      installmentsCount: 'عدد الأقساط',
      paymentFrequency: 'طريقة التقسيط',
      firstInstallmentDate: 'تاريخ أول قسط',
      treasuryId: 'الخزينة',
    };
    for (const [key, label] of Object.entries(labels)) {
      if (this.form.get(key)?.invalid) return `يرجى مراجعة الحقل: ${label}`;
    }
    if (this.itemsArray.invalid) return 'يرجى مراجعة بيانات المنتجات';
    return null;
  }

  private todayStr(): string { return new Date().toISOString().split('T')[0]; }
  private nextMonthStr(): string {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0];
  }
}
