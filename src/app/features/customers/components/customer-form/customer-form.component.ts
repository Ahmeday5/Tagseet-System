import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { CustomersService } from '../../services/customers.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CustomerFormData, InstallmentPeriod } from '../../models/customer.model';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss',
})
export class CustomerFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly customersService = inject(CustomersService);
  private readonly toast = inject(ToastService);

  readonly saved     = output<void>();
  readonly cancelled = output<void>();

  protected readonly isLoading = signal(false);

  protected readonly periods: InstallmentPeriod[] = [
    'شهري', 'أسبوعي', 'ربع سنوي', 'نصف سنوي',
  ];

  protected readonly form = this.fb.group({
    name:              ['', [Validators.required, Validators.minLength(3)]],
    phone:             ['', [Validators.required, Validators.pattern(/^05\d{8}$/)]],
    nationalId:        ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    cashPrice:         [0,  [Validators.required, Validators.min(1)]],
    downPayment:       [0,  [Validators.required, Validators.min(0)]],
    profitRate:        [20, [Validators.required, Validators.min(0), Validators.max(100)]],
    installmentsCount: [12, [Validators.required, Validators.min(1), Validators.max(120)]],
    installmentPeriod: ['شهري' as InstallmentPeriod, Validators.required],
    costPrice:         [0,  [Validators.min(0)]],
    repId:             [null as string | null],
    notes:             [''],
  });

  protected get remainingAmount(): number {
    const { cashPrice, downPayment, profitRate } = this.form.getRawValue();
    const after = (cashPrice ?? 0) - (downPayment ?? 0);
    return after * (1 + (profitRate ?? 0) / 100);
  }

  protected get installmentAmount(): number {
    const count = this.form.getRawValue().installmentsCount ?? 1;
    return count > 0 ? this.remainingAmount / count : 0;
  }

  protected isInvalid(field: string): boolean {
    const ctrl = this.form.get(field) as AbstractControl;
    return ctrl.invalid && ctrl.touched;
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const data = this.form.getRawValue() as CustomerFormData;

    this.customersService.create(data).subscribe({
      next: (customer) => {
        this.toast.success(`تم إضافة العميل "${customer.name}" بنجاح`);
        this.isLoading.set(false);
        this.saved.emit();
      },
      error: () => {
        this.toast.error('فشل إضافة العميل');
        this.isLoading.set(false);
      },
    });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}
