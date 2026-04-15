import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { CustomersService } from '../../services/customers.service';
import { InstallmentPeriod } from '../../models/customer.model';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-contract-new',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CurrencyArPipe],
  templateUrl: './contract-new.component.html',
  styleUrl: './contract-new.component.scss',
})
export class ContractNewComponent {
  private readonly svc    = inject(CustomersService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb     = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    // بيانات العميل
    name:                 ['', [Validators.required, Validators.minLength(3)]],
    phone:                ['', [Validators.required, Validators.pattern(/^05\d{8}$/)]],
    address:              [''],
    nationalId:           ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    repId:                [''],
    // بيانات البضاعة والعقد
    product:              [''],
    purchaseDate:         [this.todayStr()],
    costPrice:            [0, Validators.min(0)],
    cashPrice:            [0, [Validators.required, Validators.min(1)]],
    downPayment:          [0, Validators.min(0)],
    profitRate:           [20, [Validators.min(0), Validators.max(100)]],
    installmentPeriod:    ['شهري' as InstallmentPeriod],
    installmentsCount:    [12, [Validators.min(1), Validators.max(120)]],
    dueDay:               [1,  [Validators.min(1), Validators.max(31)]],
    firstInstallmentDate: [this.nextMonthStr()],
    notes:                [''],
  });

  private readonly _values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly summary = computed(() => {
    const v            = this._values();
    const cashPrice    = Number(v.cashPrice     ?? 0);
    const costPrice    = Number(v.costPrice      ?? 0);
    const downPayment  = Number(v.downPayment    ?? 0);
    const profitRate   = Number(v.profitRate     ?? 0);
    const count        = Math.max(1, Number(v.installmentsCount ?? 1));
    const period       = v.installmentPeriod ?? 'شهري';
    const afterDown    = cashPrice - downPayment;
    const profitAmount = afterDown * (profitRate / 100);
    const totalAmount  = afterDown + profitAmount;
    const installmentAmt = totalAmount / count;
    const marginProfit = cashPrice - costPrice + profitAmount;
    return { cashPrice, downPayment, afterDown, profitRate, profitAmount, totalAmount, installmentAmt, count, period, marginProfit };
  });

  protected readonly isSaving = signal(false);

  protected save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving.set(true);
    const v = this.form.getRawValue();
    const s = this.summary();
    this.svc.create({
      name:                 v.name,
      phone:                v.phone,
      nationalId:           v.nationalId,
      cashPrice:            s.cashPrice,
      downPayment:          s.downPayment,
      profitRate:           s.profitRate,
      installmentsCount:    s.count,
      installmentPeriod:    v.installmentPeriod as InstallmentPeriod,
      costPrice:            Number(v.costPrice),
      repId:                v.repId || null,
      notes:                v.notes,
      address:              v.address,
      product:              v.product,
      purchaseDate:         v.purchaseDate,
      dueDay:               Number(v.dueDay),
      firstInstallmentDate: v.firstInstallmentDate,
    }).subscribe({
      next: (c) => {
        this.toast.success(`تم حفظ عقد "${c.name}" بنجاح`);
        this.isSaving.set(false);
        this.router.navigate(['/customers/customer-list']);
      },
      error: () => { this.toast.error('فشل حفظ العقد'); this.isSaving.set(false); },
    });
  }

  protected reset(): void {
    this.form.reset({
      installmentsCount: 12, profitRate: 20, installmentPeriod: 'شهري', dueDay: 1,
      purchaseDate: this.todayStr(), firstInstallmentDate: this.nextMonthStr(),
    });
  }

  protected isInvalid(f: string): boolean {
    const c = this.form.get(f);
    return !!c && c.invalid && c.touched;
  }

  private todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  private nextMonthStr(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  }
}
