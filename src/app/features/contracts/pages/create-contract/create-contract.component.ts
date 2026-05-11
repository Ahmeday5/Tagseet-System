import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';

import { ContractsService } from '../../services/contracts.service';
import { CustomersService } from '../../../customers/services/customers.service';
import { ProductsService } from '../../../products/services/products.service';
import { WarehouseService } from '../../../warehouse/services/warehouse.service';
import { TreasuryService } from '../../../treasury/services/treasury.service';
import { RepsService } from '../../../reps/services/reps.service';

import {
  ContractFormState,
  ContractPaymentFrequency,
} from '../../models/contract.model';
import { DashboardClient } from '../../../customers/models/dashboard-client.model';
import { Product } from '../../../products/models/product.model';
import { Warehouse } from '../../../warehouse/models/warehouse.model';
import { Treasury } from '../../../treasury/models/treasury.model';
import { Representative } from '../../../reps/models/rep.model';

import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ToastService } from '../../../../core/services/toast.service';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';

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

  // --- Signals for Lookups ---
  clients = signal<DashboardClient[]>([]);
  products = signal<Product[]>([]);
  warehouses = signal<Warehouse[]>([]);
  treasuries = signal<Treasury[]>([]);
  representatives = signal<Representative[]>([]);

  // --- UI State ---
  loading = signal(true);
  submitting = signal(false);

  form!: FormGroup;

  frequencies: { value: ContractPaymentFrequency; label: string }[] = [
    { value: 'Daily', label: 'يومي' },
    { value: 'Weekly', label: 'أسبوعي' },
    { value: 'Monthly', label: 'شهري' },
    { value: 'Yearly', label: 'سنوي' },
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadLookups();
    this.setupCalculations();
  }

  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const firstInstallmentDate = nextMonth.toISOString().split('T')[0];

    this.form = this.fb.nonNullable.group({
      clientId: [null, [Validators.required]],
      productId: [null, [Validators.required]],
      warehouseId: [null, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      purchaseDate: [today, [Validators.required]],
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      cashPrice: [0, [Validators.required, Validators.min(0)]],
      downPayment: [0, [Validators.required, Validators.min(0)]],
      profitRate: [18, [Validators.required, Validators.min(0)]],
      installmentsCount: [12, [Validators.required, Validators.min(1)]],
      installmentAmount: [{ value: 0, disabled: true }, [Validators.required]],
      paymentFrequency: ['Monthly', [Validators.required]],
      firstInstallmentDate: [firstInstallmentDate, [Validators.required]],
      treasuryId: [null, [Validators.required]],
      representativeId: [null],
      notes: [''],
    });
  }

  private loadLookups(): void {
    this.loading.set(true);

    forkJoin({
      clients: this.customersService.listDashboard({ pageSize: 1000 }),
      products: this.productsService.listAll(),
      warehouses: this.warehouseService.list(),
      treasuries: this.treasuryService.list(),
      reps: this.repsService.list({ pageSize: 1000 }),
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
        error: () => this.toast.error('حدث خطأ أثناء تحميل البيانات'),
      });
  }

  private setupCalculations(): void {
    // Re-calculate installment amount whenever relevant fields change
    this.form.valueChanges.subscribe(() => {
      this.calculateInstallment();
    });

    // Auto-fill prices when product changes
    this.form.get('productId')?.valueChanges.subscribe((id) => {
      const product = this.products().find((p) => p.id === Number(id));
      if (product) {
        this.form.patchValue(
          {
            purchasePrice: product.purchasePrice,
            cashPrice: product.sellingPrice,
          },
          { emitEvent: true }
        );
      }
    });
  }

  private calculateInstallment(): void {
    const cashPrice = this.form.get('cashPrice')?.value || 0;
    const downPayment = this.form.get('downPayment')?.value || 0;
    const profitRate = this.form.get('profitRate')?.value || 0;
    const count = this.form.get('installmentsCount')?.value || 1;

    const remaining = cashPrice - downPayment;
    if (remaining <= 0) {
      this.form.get('installmentAmount')?.setValue(0, { emitEvent: false });
      return;
    }

    // Standard Simple Profit Calculation:
    // Total = (CashPrice - DownPayment) * (1 + ProfitRate/100)
    // Installment = Total / Count
    const totalWithProfit = remaining * (1 + profitRate / 100);
    const amount = totalWithProfit / count;

    this.form
      .get('installmentAmount')
      ?.setValue(Number(amount.toFixed(2)), { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formValue = this.form.getRawValue();

    // The backend expects ISO strings for dates
    const payload: ContractFormState = {
      ...formValue,
      purchaseDate: new Date(formValue.purchaseDate).toISOString(),
      firstInstallmentDate: new Date(
        formValue.firstInstallmentDate
      ).toISOString(),
      clientId: Number(formValue.clientId),
      productId: Number(formValue.productId),
      warehouseId: Number(formValue.warehouseId),
      treasuryId: Number(formValue.treasuryId),
      representativeId: formValue.representativeId
        ? Number(formValue.representativeId)
        : null,
    };

    this.contractsService
      .create(payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('تم إنشاء العقد بنجاح');
          this.router.navigate(['/contracts']);
        },
        error: (err) => {
          const msg = err?.error?.message || 'فشل في إنشاء العقد';
          this.toast.error(msg);
        },
      });
  }
}
