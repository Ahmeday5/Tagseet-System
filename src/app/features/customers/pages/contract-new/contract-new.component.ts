import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, finalize } from 'rxjs';

import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

import { ContractsService } from '../../../contracts/services/contracts.service';
import { CustomersService } from '../../services/customers.service';
import { ProductsService } from '../../../products/services/products.service';
import { WarehouseService } from '../../../warehouse/services/warehouse.service';
import { TreasuryService } from '../../../treasury/services/treasury.service';
import { RepsService } from '../../../reps/services/reps.service';

import {
  ContractFormState,
  ContractPaymentFrequency,
} from '../../../contracts/models/contract.model';

import { DashboardClient } from '../../models/dashboard-client.model';
import { Product } from '../../../products/models/product.model';
import { Warehouse } from '../../../warehouse/models/warehouse.model';
import { Treasury } from '../../../treasury/models/treasury.model';
import { Representative } from '../../../reps/models/rep.model';

@Component({
  selector: 'app-contract-new',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyArPipe,
    FormErrorComponent,
    LoaderComponent,
  ],
  templateUrl: './contract-new.component.html',
  styleUrl: './contract-new.component.scss',
})
export class ContractNewComponent implements OnInit {
  // ───────────────── deps ─────────────────
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  private readonly contractsService = inject(ContractsService);
  private readonly customersService = inject(CustomersService);
  private readonly productsService = inject(ProductsService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly repsService = inject(RepsService);

  private readonly toast = inject(ToastService);

  // ───────────────── UI state ─────────────────
  protected readonly loading = signal(true);
  protected readonly isSaving = signal(false);

  // ───────────────── lookup data ─────────────────
  protected readonly clients = signal<DashboardClient[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly treasuries = signal<Treasury[]>([]);
  protected readonly representatives = signal<Representative[]>([]);

  // ───────────────── payment frequencies ─────────────────
  protected readonly frequencies: {
    value: ContractPaymentFrequency;
    label: string;
  }[] = [
    { value: 'Daily', label: 'يومي' },
    { value: 'Weekly', label: 'أسبوعي' },
    { value: 'Monthly', label: 'شهري' },
    { value: 'Yearly', label: 'سنوي' },
  ];

  // ───────────────── form ─────────────────
  protected readonly form = this.fb.nonNullable.group({
    clientId: [null as number | null, [Validators.required]],
    productId: [null as number | null, [Validators.required]],
    warehouseId: [null as number | null, [Validators.required]],

    quantity: [1, [Validators.required, Validators.min(1)]],

    purchaseDate: [this.todayStr(), [Validators.required]],

    purchasePrice: [0, [Validators.required, Validators.min(0)]],

    cashPrice: [0, [Validators.required, Validators.min(1)]],

    downPayment: [0, [Validators.required, Validators.min(0)]],

    profitRate: [20, [Validators.required, Validators.min(0), Validators.max(100)]],

    installmentsCount: [
      12,
      [Validators.required, Validators.min(1), Validators.max(120)],
    ],

    installmentAmount: [
      { value: 0, disabled: true },
      [Validators.required],
    ],

    paymentFrequency: [
      'Monthly' as ContractPaymentFrequency,
      [Validators.required],
    ],

    firstInstallmentDate: [
      this.nextMonthStr(),
      [Validators.required],
    ],

    treasuryId: [null as number | null, [Validators.required]],

    representativeId: [null as number | null],

    notes: [''],
  });

  // ───────────────── reactive values ─────────────────
  private readonly values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  // ───────────────── computed summary ─────────────────
  protected readonly summary = computed(() => {
    const v = this.values();

    const cashPrice = Number(v.cashPrice ?? 0);
    const purchasePrice = Number(v.purchasePrice ?? 0);
    const downPayment = Number(v.downPayment ?? 0);
    const profitRate = Number(v.profitRate ?? 0);
    const count = Math.max(1, Number(v.installmentsCount ?? 1));

    const afterDown = Math.max(0, cashPrice - downPayment);

    const profitAmount = afterDown * (profitRate / 100);

    const totalAmount = afterDown + profitAmount;

    const installmentAmt = totalAmount / count;

    const marginProfit =
      cashPrice - purchasePrice + profitAmount;

    return {
      cashPrice,
      downPayment,
      afterDown,
      profitRate,
      profitAmount,
      totalAmount,
      installmentAmt,
      count,
      marginProfit,
    };
  });

  // ───────────────── lifecycle ─────────────────
  ngOnInit(): void {
    this.loadLookups();
    this.setupFormEffects();
  }

  // ───────────────── lookups ─────────────────
  private loadLookups(): void {
    this.loading.set(true);

    forkJoin({
      clients: this.customersService.listDashboard({
        pageSize: 1000,
      }),

      products: this.productsService.listAll(),

      warehouses: this.warehouseService.list(),

      treasuries: this.treasuryService.list(),

      reps: this.repsService.list({
        pageSize: 1000,
      }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.clients.set(res.clients.clients.data);
          this.products.set(res.products);
          this.warehouses.set(res.warehouses);
          this.treasuries.set(res.treasuries);
          this.representatives.set(res.reps.data);
        },

        error: () => {
          this.toast.error('حدث خطأ أثناء تحميل البيانات');
        },
      });
  }

  // ───────────────── calculations ─────────────────
  private setupFormEffects(): void {
    this.form.valueChanges.subscribe(() => {
      this.calculateInstallment();
    });

    this.form
      .get('productId')
      ?.valueChanges.subscribe((id) => {
        const product = this.products().find(
          (p) => p.id === Number(id),
        );

        if (!product) return;

        this.form.patchValue(
          {
            purchasePrice: product.purchasePrice,
            cashPrice: product.sellingPrice,
          },
          {
            emitEvent: true,
          },
        );
      });
  }

  private calculateInstallment(): void {
    const cashPrice =
      Number(this.form.get('cashPrice')?.value) || 0;

    const downPayment =
      Number(this.form.get('downPayment')?.value) || 0;

    const profitRate =
      Number(this.form.get('profitRate')?.value) || 0;

    const count =
      Number(this.form.get('installmentsCount')?.value) || 1;

    const remaining = cashPrice - downPayment;

    if (remaining <= 0) {
      this.form
        .get('installmentAmount')
        ?.setValue(0, {
          emitEvent: false,
        });

      return;
    }

    const totalWithProfit =
      remaining * (1 + profitRate / 100);

    const installmentAmount =
      totalWithProfit / count;

    this.form
      .get('installmentAmount')
      ?.setValue(
        Number(installmentAmount.toFixed(2)),
        {
          emitEvent: false,
        },
      );
  }

  // ───────────────── submit ─────────────────
  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error(this.firstInvalidFieldMessage() || 'يرجى تعبئة الحقول المطلوبة');
      return;
    }

    this.isSaving.set(true);

    const raw = this.form.getRawValue();

    const payload: ContractFormState = {
      clientId: Number(raw.clientId),

      productId: Number(raw.productId),

      warehouseId: Number(raw.warehouseId),

      quantity: Number(raw.quantity),

      purchaseDate: new Date(
        raw.purchaseDate,
      ).toISOString(),

      purchasePrice: Number(raw.purchasePrice),

      cashPrice: Number(raw.cashPrice),

      downPayment: Number(raw.downPayment),

      profitRate: Number(raw.profitRate),

      installmentsCount: Number(
        raw.installmentsCount,
      ),

      installmentAmount: Number(
        raw.installmentAmount,
      ),

      paymentFrequency:
        raw.paymentFrequency as ContractPaymentFrequency,

      firstInstallmentDate: new Date(
        raw.firstInstallmentDate,
      ).toISOString(),

      treasuryId: Number(raw.treasuryId),

      representativeId: raw.representativeId
        ? Number(raw.representativeId)
        : null,

      notes: raw.notes?.trim() || '',
    };

    this.contractsService
      .create(payload)
      .pipe(
        finalize(() => {
          this.isSaving.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.toast.success(
            'تم إنشاء العقد بنجاح',
          );

          this.router.navigate([
            '/customers/customer-list',
          ]);
        },

        error: (err: ApiError) => {
          this.toast.error(apiErrorToMessage(err, 'فشل في إنشاء العقد'));
        },
      });
  }

  /**
   * Builds a human-readable message pointing to the first invalid field,
   * so the user knows what to fix without scrolling the form. The labels
   * mirror what the corresponding form-error message would surface.
   */
  private firstInvalidFieldMessage(): string | null {
    const labels: Record<string, string> = {
      clientId: 'العميل',
      productId: 'المنتج',
      warehouseId: 'المخزن',
      quantity: 'الكمية',
      purchaseDate: 'تاريخ الشراء',
      purchasePrice: 'سعر الشراء',
      cashPrice: 'السعر الكاش',
      downPayment: 'المقدم',
      profitRate: 'نسبة الربح',
      installmentsCount: 'عدد الأقساط',
      paymentFrequency: 'طريقة التقسيط',
      firstInstallmentDate: 'تاريخ أول قسط',
      treasuryId: 'الخزينة',
    };
    for (const [key, label] of Object.entries(labels)) {
      const control = this.form.get(key);
      if (control?.invalid) return `يرجى مراجعة الحقل: ${label}`;
    }
    return null;
  }

  // ───────────────── helpers ─────────────────
  protected reset(): void {
    this.form.reset({
      quantity: 1,
      purchasePrice: 0,
      cashPrice: 0,
      downPayment: 0,
      profitRate: 20,
      installmentsCount: 12,
      paymentFrequency: 'Monthly',
      purchaseDate: this.todayStr(),
      firstInstallmentDate: this.nextMonthStr(),
      installmentAmount: 0,
    });
  }

  protected isInvalid(field: string): boolean {
    const control = this.form.get(field);

    return !!control &&
      control.invalid &&
      control.touched;
  }

  private todayStr(): string {
    return new Date()
      .toISOString()
      .split('T')[0];
  }

  private nextMonthStr(): string {
    const date = new Date();

    date.setMonth(date.getMonth() + 1);

    return date
      .toISOString()
      .split('T')[0];
  }
}
