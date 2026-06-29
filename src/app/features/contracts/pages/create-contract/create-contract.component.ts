import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, finalize, of, catchError } from 'rxjs';
import { ContractPrintModalComponent } from '../../components/contract-print-modal/contract-print-modal.component';

import { ContractsService } from '../../services/contracts.service';
import { CustomersService } from '../../../customers/services/customers.service';
import { ProductsService } from '../../../products/services/products.service';
import { WarehouseService } from '../../../warehouse/services/warehouse.service';
import { TreasuryService } from '../../../treasury/services/treasury.service';
import { RepsService } from '../../../reps/services/reps.service';

import {
  ContractFormState,
  ContractItem,
  ContractPaymentFrequency,
} from '../../models/contract.model';
import { DashboardClient } from '../../../customers/models/dashboard-client.model';
import { LookupItem } from '../../../../core/models/lookup.model';

import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { ToastService } from '../../../../core/services/toast.service';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { AuthService } from '../../../../core/services/auth.service';
import { PERMISSIONS } from '../../../../core/constants/permissions.const';

@Component({
  selector: 'app-create-contract',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormErrorComponent,
    LoaderComponent,
    CurrencyArPipe,
    SearchableSelectComponent,
    ContractPrintModalComponent,
  ],
  templateUrl: './create-contract.component.html',
  styleUrl: './create-contract.component.scss',
})
export class CreateContractComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly contractsService = inject(ContractsService);
  private readonly customersService = inject(CustomersService);
  private readonly productsService = inject(ProductsService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly repsService = inject(RepsService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  // ── Lookup signals ──
  clients = signal<DashboardClient[]>([]);
  products = signal<LookupItem[]>([]);
  warehouses = signal<LookupItem[]>([]);
  treasuries = signal<LookupItem[]>([]);
  representatives = signal<LookupItem[]>([]);

  protected readonly clientOptions = computed<SearchableSelectOption[]>(() =>
    this.clients().map((c) => ({
      value: c.id,
      label: c.fullName,
      hint: c.phoneNumber,
    })),
  );
  protected readonly productOptions = computed<SearchableSelectOption[]>(() =>
    this.toOptions(this.products()),
  );
  protected readonly warehouseOptions = computed<SearchableSelectOption[]>(() =>
    this.toOptions(this.warehouses()),
  );
  protected readonly treasuryOptions = computed<SearchableSelectOption[]>(() =>
    this.toOptions(this.treasuries()),
  );
  protected readonly representativeOptions = computed<SearchableSelectOption[]>(
    () => this.toOptions(this.representatives()),
  );

  private toOptions(items: LookupItem[]): SearchableSelectOption[] {
    return items.map((i) => ({ value: i.id, label: i.name }));
  }

  // ── UI state ──
  loading = signal(true);
  submitting = signal(false);
  printContractId = signal<number | null>(null);

  form!: FormGroup;

  frequencies: { value: ContractPaymentFrequency; label: string }[] = [
    { value: 'Monthly', label: 'شهري' },
    { value: 'Quarterly', label: 'ربع سنوي' },
    { value: 'SemiAnnual', label: 'نصف سنوي' },
  ];

  // Per-item sell prices fetched from product catalog (index = item index)
  private itemSellPrices: (number | null)[] = [null];

  ngOnInit(): void {
    this.initForm();
    this.loadLookups();
    this.setupCalculations();
  }

  // ─────────────── FormArray helpers ───────────────

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  private createItemGroup(): FormGroup {
    return this.fb.nonNullable.group({
      productId: this.fb.control<number | null>(null, [Validators.required]),
      warehouseId: this.fb.control<number | null>(null, [Validators.required]),
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
  }

  addItem(): void {
    const group = this.createItemGroup();
    this.itemsArray.push(group);
    this.itemSellPrices.push(null);
    this.watchItemProduct(group, this.itemsArray.length - 1);
  }

  removeItem(index: number): void {
    if (this.itemsArray.length <= 1) return;
    this.itemsArray.removeAt(index);
    this.itemSellPrices.splice(index, 1);
  }

  protected getItemControl(index: number, field: string): AbstractControl | null {
    return this.itemsArray.at(index)?.get(field) ?? null;
  }

  // ─────────────── Form init ───────────────

  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const firstInstallmentDate = nextMonth.toISOString().split('T')[0];

    this.form = this.fb.nonNullable.group({
      clientId: [null as number | null, [Validators.required]],
      items: this.fb.array([this.createItemGroup()]),
      dateOfSale: [today, [Validators.required]],
      cashPrice: [0, [Validators.required, Validators.min(1)]],
      downPayment: [0, [Validators.required, Validators.min(0)]],
      profitRate: [18, [Validators.required, Validators.min(0)]],
      installmentsCount: [12, [Validators.required, Validators.min(1)]],
      installmentAmount: [{ value: 0, disabled: true }],
      paymentFrequency: ['Monthly' as ContractPaymentFrequency, [Validators.required]],
      firstInstallmentDate: [firstInstallmentDate, [Validators.required]],
      treasuryId: [null as number | null, [Validators.required]],
      representativeId: [null as number | null],
      notes: [''],
    });
  }

  // ─────────────── Lookups ───────────────

  private loadLookups(): void {
    this.loading.set(true);

    forkJoin({
      clients: this.customersService
        .listAllClients()
        .pipe(catchError(() => of([] as DashboardClient[]))),
      products: this.productsService
        .lookup()
        .pipe(catchError(() => of([] as LookupItem[]))),
      warehouses: this.warehouseService
        .lookup()
        .pipe(catchError(() => of([] as LookupItem[]))),
      treasuries: this.treasuryService
        .lookup()
        .pipe(catchError(() => of([] as LookupItem[]))),
      reps: this.repsService
        .lookup()
        .pipe(catchError(() => of([] as LookupItem[]))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.clients.set(res.clients);
          this.products.set(res.products);
          this.warehouses.set(res.warehouses);
          this.treasuries.set(res.treasuries);
          this.representatives.set(res.reps);
        },
        error: () => this.toast.error('حدث خطأ أثناء تحميل البيانات'),
      });
  }

  // ─────────────── Calculations ───────────────

  private setupCalculations(): void {
    this.form.valueChanges.subscribe(() => this.calculateInstallment());
    // Watch first item's product on init
    this.watchItemProduct(this.itemsArray.at(0) as FormGroup, 0);
  }

  private watchItemProduct(group: FormGroup, index: number): void {
    if (!this.auth.hasPermission(PERMISSIONS.suppliersView)) return;

    group.get('productId')?.valueChanges.subscribe((id) => {
      const productId = Number(id);
      if (!productId) { this.itemSellPrices[index] = null; return; }

      this.productsService.getById(productId).subscribe({
        next: (product) => {
          this.itemSellPrices[index] = product.sellingPrice;
          this.refreshCashPriceSuggestion();
        },
        error: () => { this.itemSellPrices[index] = null; },
      });
    });
  }

  private refreshCashPriceSuggestion(): void {
    let total = 0;
    for (let i = 0; i < this.itemsArray.length; i++) {
      const price = this.itemSellPrices[i];
      if (price == null) return; // don't auto-fill unless all items have known prices
      const qty = Math.max(1, Number(this.itemsArray.at(i).get('quantity')?.value ?? 1));
      total += price * qty;
    }
    if (total > 0) {
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
    this.form
      .get('installmentAmount')
      ?.setValue(Number((totalWithProfit / count).toFixed(2)), { emitEvent: false });
  }

  // ─────────────── Submit ───────────────

  closePrintModal(): void {
    this.printContractId.set(null);
    this.router.navigate(['/contracts']);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();

    const items: ContractItem[] = (raw.items as any[]).map((item) => ({
      productId: Number(item.productId),
      warehouseId: Number(item.warehouseId),
      quantity: Number(item.quantity),
    }));

    const payload: ContractFormState = {
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
      notes: raw.notes?.trim() || undefined,
    };

    this.contractsService
      .create(payload)
      .pipe(finalize(() => this.submitting.set(false)))
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
}
