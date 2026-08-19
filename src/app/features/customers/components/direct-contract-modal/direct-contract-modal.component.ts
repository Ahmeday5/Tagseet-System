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
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ContractPrintModalComponent } from '../../../contracts/components/contract-print-modal/contract-print-modal.component';
import { SupplierInvoiceQuickAddModalComponent } from '../supplier-invoice-quick-add-modal/supplier-invoice-quick-add-modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { LookupItem } from '../../../../core/models/lookup.model';

import { ContractsService } from '../../../contracts/services/contracts.service';
import { CustomersService } from '../../services/customers.service';
import { TreasuryService } from '../../../treasury/services/treasury.service';
import { RepsService } from '../../../reps/services/reps.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';

import {
  ContractPaymentFrequency,
  CreatedDirectContract,
  CreateDirectContractPayload,
  DirectContractItem,
} from '../../../contracts/models/contract.model';
import { DashboardClient } from '../../models/dashboard-client.model';
import { PurchaseInvoice } from '../../../invoices/models/invoice.model';

@Component({
  selector: 'app-direct-contract-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
    CurrencyArPipe,
    ContractPrintModalComponent,
    SupplierInvoiceQuickAddModalComponent,
  ],
  templateUrl: './direct-contract-modal.component.html',
  styleUrl: './direct-contract-modal.component.scss',
})
export class DirectContractModalComponent {
  // ── inputs / outputs ──
  readonly open = input.required<boolean>();
  readonly editId = input<number | null>(null);

  readonly closed = output<void>();
  readonly created = output<CreatedDirectContract>();
  readonly updated = output<void>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly contractsService = inject(ContractsService);
  private readonly customersService = inject(CustomersService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly repsService = inject(RepsService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly toast = inject(ToastService);

  // ── state ──
  protected readonly submitting = signal(false);
  protected readonly loadingLookups = signal(false);
  protected readonly loadingDetails = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly lookupsLoaded = signal(false);
  protected readonly isEditMode = computed(() => this.editId() !== null);
  protected readonly printContractId = signal<number | null>(null);
  private pendingCreated: CreatedDirectContract | null = null;

  // ── inline "add supplier invoice" modal ──
  // Opened from the items section so the operator can record the purchase
  // invoice behind this sale without leaving the contract form. On save,
  // the invoice's supplier + line items flow straight into this form.
  protected readonly invoiceModalOpen = signal(false);

  // ── lookup data ──
  protected readonly clients = signal<DashboardClient[]>([]);
  protected readonly treasuries = signal<LookupItem[]>([]);
  protected readonly representatives = signal<LookupItem[]>([]);
  protected readonly suppliers = signal<LookupItem[]>([]);

  protected readonly frequencies: { value: ContractPaymentFrequency; label: string }[] = [
    { value: 'Monthly', label: 'شهري' },
    { value: 'Quarterly', label: 'ربع سنوي' },
    { value: 'SemiAnnual', label: 'نصف سنوي' },
  ];

  protected readonly clientOptions = computed<SearchableSelectOption[]>(() =>
    this.clients().map((c) => ({ value: c.id, label: c.fullName, hint: c.phoneNumber })),
  );
  protected readonly treasuryOptions = computed<SearchableSelectOption[]>(() =>
    this.treasuries().map((t) => ({ value: t.id, label: t.name })),
  );
  protected readonly representativeOptions = computed<SearchableSelectOption[]>(() =>
    this.representatives().map((r) => ({ value: r.id, label: r.name })),
  );
  protected readonly supplierOptions = computed<SearchableSelectOption[]>(() =>
    this.suppliers().map((s) => ({ value: s.id, label: s.name })),
  );

  // ── form ──
  protected readonly form = this.fb.nonNullable.group({
    clientId: this.fb.control<number | null>(null, [Validators.required]),
    items: this.fb.array([this.createItemGroup()]),
    dateOfSale: [this.todayStr(), [Validators.required]],
    cashPrice: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    downPayment: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    profitRate: [20, [Validators.required, Validators.min(0), Validators.max(100)]],
    installmentsCount: [12, [Validators.required, Validators.min(1), Validators.max(120)]],
    installmentAmount: [{ value: 0, disabled: true }],
    isCustomInstallmentAmount: [false],
    paymentFrequency: ['Monthly' as ContractPaymentFrequency, [Validators.required]],
    firstInstallmentDate: [this.nextMonthStr(), [Validators.required]],
    treasuryId: this.fb.control<number | null>(null, [Validators.required]),
    representativeId: this.fb.control<number | null>(null),
    supplierId: this.fb.control<number | null>(null),
    notes: [''],
  });

  // ── reactive summary ──
  private readonly values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly summary = computed(() => {
    const v = this.values();
    const cashPrice = Number(v.cashPrice ?? 0); // total selling price (contract level)
    const downPayment = Number(v.downPayment ?? 0);
    const profitRate = Number(v.profitRate ?? 0);
    const count = Math.max(1, Number(v.installmentsCount ?? 1));
    const afterDown = Math.max(0, cashPrice - downPayment);
    const profitAmount = afterDown * (profitRate / 100);
    const totalAmount = afterDown + profitAmount;
    const installmentAmt = totalAmount / count;
    // Total cost of goods + total quantity across all product rows (for reference)
    const items = ((v as any).items ?? []) as any[];
    const totalCost = items.reduce((sum: number, item: any) => {
      return sum + (Number(item?.purchasePrice ?? 0) * Math.max(1, Number(item?.quantity ?? 1)));
    }, 0);
    const totalQuantity = items.reduce((sum: number, item: any) => sum + Math.max(1, Number(item?.quantity ?? 1)), 0);
    const grossProfit = cashPrice - totalCost;
    return {
      cashPrice,
      downPayment,
      afterDown,
      profitAmount,
      totalAmount,
      installmentAmt,
      count,
      totalCost,
      totalQuantity,
      grossProfit,
    };
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      if (this.lookupsLoaded()) return;
      this.loadLookups();
    }, { allowSignalWrites: true });

    effect(() => {
      const id = this.editId();
      if (!id) return;
      this.loadDetails(id);
    }, { allowSignalWrites: true });

    this.form.get('isCustomInstallmentAmount')?.valueChanges.subscribe((custom) => {
      this.syncInstallmentControlState(custom);
    });
    this.form.valueChanges.subscribe(() => this.recalculateInstallment());
    this.syncInstallmentControlState(false);
  }

  // ── FormArray helpers ──

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  private createItemGroup(): FormGroup {
    return this.fb.nonNullable.group({
      productName: ['', [Validators.required, Validators.maxLength(200)]],
      purchasePrice: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
      quantity: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    });
  }

  /** Line total for a single product row: cost × quantity. */
  protected itemLineTotal(index: number): number {
    const group = this.itemsArray.at(index);
    const price = Number(group?.get('purchasePrice')?.value ?? 0);
    const qty = Number(group?.get('quantity')?.value ?? 0);
    return price * qty;
  }

  protected addItem(): void {
    this.itemsArray.push(this.createItemGroup());
  }

  protected removeItem(index: number): void {
    if (this.itemsArray.length <= 1) return;
    this.itemsArray.removeAt(index);
  }

  protected getItemControl(index: number, field: string): AbstractControl | null {
    return this.itemsArray.at(index)?.get(field) ?? null;
  }

  // ── inline "add supplier invoice" ──

  protected openInvoiceModal(): void {
    this.invoiceModalOpen.set(true);
  }

  protected closeInvoiceModal(): void {
    this.invoiceModalOpen.set(false);
  }

  /**
   * The invoice modal reports the newly created purchase invoice — replace
   * the (blank) product rows with its line items, attach the supplier, and
   * suggest a cash price from the invoice total so the operator only has to
   * confirm the markup instead of re-typing everything.
   */
  protected onInvoiceCreated(invoice: PurchaseInvoice): void {
    this.invoiceModalOpen.set(false);

    while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
    for (const line of invoice.items) {
      const group = this.createItemGroup();
      group.patchValue({
        productName: line.productName?.trim() || '',
        purchasePrice: line.unitPrice,
        quantity: line.quantity,
      });
      this.itemsArray.push(group);
    }
    if (this.itemsArray.length === 0) this.addItem();

    this.form.patchValue({
      supplierId: invoice.supplierId,
      cashPrice: this.form.controls.cashPrice.value || invoice.totalAmount || null,
    });

    this.toast.success(`تم إرفاق فاتورة المشتريات ${invoice.invoiceNumber} ببيانات العقد`);
  }

  // ── template handlers ──

  protected onSubmit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error(this.firstInvalidLabel() ?? 'يرجى تعبئة الحقول المطلوبة');
      return;
    }

    if (this.form.get('isCustomInstallmentAmount')?.value && this.getLastInstallmentPreview() < 0) {
      this.toast.error('قيمة القسط المدخلة أكبر من إجمالي العقد المتوقع لعدد الأقساط المحدد.');
      return;
    }

    const raw = this.form.getRawValue();

    const items: DirectContractItem[] = (raw.items as any[]).map((item) => ({
      productName: String(item.productName ?? '').trim(),
      purchasePrice: Number(item.purchasePrice ?? 0),
      quantity: Number(item.quantity ?? 1),
    }));

    const payload: CreateDirectContractPayload = {
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
      representativeId: raw.representativeId ? Number(raw.representativeId) : undefined,
      supplierId: raw.supplierId ? Number(raw.supplierId) : undefined,
      notes: raw.notes?.trim() || undefined,
    };

    if (raw.isCustomInstallmentAmount) {
      payload.isCustomInstallmentAmount = true;
    }

    this.serverError.set(null);
    this.submitting.set(true);

    const id = this.editId();

    if (id) {
      this.contractsService
        .updateDirect(id, payload)
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: () => {
            this.toast.success('تم تعديل العقد المباشر بنجاح');
            this.resetForm();
            this.updated.emit();
          },
          error: (err: ApiError) => {
            this.serverError.set(err.message || 'تعذّر تعديل العقد');
          },
        });
    } else {
      this.contractsService
        .createDirect(payload)
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: (res) => {
            this.toast.success('تم إنشاء العقد المباشر بنجاح');
            this.resetForm();
            this.pendingCreated = res;
            this.printContractId.set(res.id);
          },
          error: (err: ApiError) => {
            this.serverError.set(err.message || 'تعذّر إنشاء العقد');
          },
        });
    }
  }

  protected close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  protected closePrintModal(): void {
    this.printContractId.set(null);
    if (this.pendingCreated) {
      this.created.emit(this.pendingCreated);
      this.pendingCreated = null;
    }
  }

  protected isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  // ── internals ──

  private loadLookups(): void {
    this.loadingLookups.set(true);

    forkJoin({
      clients: this.customersService.listAllClients().pipe(catchError(() => of([] as DashboardClient[]))),
      treasuries: this.treasuryService.lookup().pipe(catchError(() => of([] as LookupItem[]))),
      reps: this.repsService.lookup().pipe(catchError(() => of([] as LookupItem[]))),
      suppliers: this.suppliersService.lookup().pipe(catchError(() => of([] as LookupItem[]))),
    })
      .pipe(finalize(() => this.loadingLookups.set(false)))
      .subscribe({
        next: (res) => {
          this.clients.set(res.clients);
          this.treasuries.set(res.treasuries);
          this.representatives.set(res.reps);
          this.suppliers.set(res.suppliers);
          this.lookupsLoaded.set(true);
        },
        error: () => this.toast.error('حدث خطأ أثناء تحميل البيانات'),
      });
  }

  private loadDetails(id: number): void {
    this.loadingDetails.set(true);
    this.contractsService.getDetails(id).subscribe({
      next: (d) => {
        this.loadingDetails.set(false);

        // Repopulate items FormArray
        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        const sourceItems = d.items.length > 0 ? d.items : [{ productName: '', purchasePrice: 0, quantity: 1 }];
        sourceItems.forEach((item) => {
          const group = this.createItemGroup();
          group.patchValue({
            productName: item.productName ?? '',
            purchasePrice: item.purchasePrice ?? 0,
            quantity: item.quantity ?? 1,
          });
          this.itemsArray.push(group);
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
          treasuryId: Number(d.contract.treasuryId),
          representativeId: d.representative?.id ?? null,
          supplierId: d.supplier?.id ?? null,
          notes: d.contract.notes || '',
          isCustomInstallmentAmount: Boolean((d.contract as { isCustomInstallmentAmount?: boolean }).isCustomInstallmentAmount),
        }, { emitEvent: false });
        this.form.get('installmentAmount')?.setValue(d.contract.installmentAmount, { emitEvent: false });
        this.syncInstallmentControlState(this.form.get('isCustomInstallmentAmount')?.value);
      },
      error: () => {
        this.loadingDetails.set(false);
        this.toast.error('تعذّر تحميل تفاصيل العقد');
      },
    });
  }

  protected getLastInstallmentPreview(): number {
    if (!this.form.get('isCustomInstallmentAmount')?.value) return 0;

    const { totalAmount, count } = this.summary();
    const installmentAmount = Number(this.form.get('installmentAmount')?.value ?? 0);
    return totalAmount - (Math.max(0, count - 1) * installmentAmount);
  }

  private recalculateInstallment(): void {
    if (this.form.get('isCustomInstallmentAmount')?.value) return;

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
      Number((totalWithProfit / count).toFixed(2)),
      { emitEvent: false },
    );
  }

  private syncInstallmentControlState(isCustom: boolean | null | undefined): void {
    const amountCtrl = this.form.get('installmentAmount');
    if (!amountCtrl) return;

    if (isCustom) {
      amountCtrl.enable({ emitEvent: false });
      if (Number(amountCtrl.value ?? 0) <= 0) {
        this.recalculateInstallment();
      }
      return;
    }

    amountCtrl.disable({ emitEvent: false });
    this.recalculateInstallment();
  }

  private resetForm(): void {
    while (this.itemsArray.length > 1) this.itemsArray.removeAt(1);
    this.form.reset({
      clientId: null,
      dateOfSale: this.todayStr(),
      cashPrice: null,
      downPayment: null,
      profitRate: 20,
      installmentsCount: 12,
      installmentAmount: 0,
      isCustomInstallmentAmount: false,
      paymentFrequency: 'Monthly',
      firstInstallmentDate: this.nextMonthStr(),
      treasuryId: null,
      representativeId: null,
      supplierId: null,
      notes: '',
    });
    this.syncInstallmentControlState(false);
    // Reset first item
    this.itemsArray.at(0)?.reset({ productName: '', purchasePrice: null, quantity: null });
    this.serverError.set(null);
  }

  private firstInvalidLabel(): string | null {
    const labels: Record<string, string> = {
      clientId: 'العميل',
      cashPrice: 'سعر البيع الكاش',
      profitRate: 'نسبة الربح',
      installmentsCount: 'عدد الأقساط',
      paymentFrequency: 'طريقة التقسيط',
      firstInstallmentDate: 'تاريخ أول قسط',
      treasuryId: 'خزينة المقدم',
    };
    for (const [key, label] of Object.entries(labels)) {
      if (this.form.get(key)?.invalid) return `يرجى مراجعة الحقل: ${label}`;
    }
    if (this.itemsArray.invalid) return 'يرجى مراجعة بيانات المنتجات';
    return null;
  }

  private todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  private nextMonthStr(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }
}
