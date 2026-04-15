import { ChangeDetectionStrategy, Component, inject, OnInit, signal, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomersService } from '../../services/customers.service';
import { Customer, PaymentStatus } from '../../models/customer.model';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BadgeComponent, CurrencyArPipe, DateArPipe],
  templateUrl: './customer-detail.component.html',
  styleUrl: './customer-detail.component.scss',
})
export class CustomerDetailComponent implements OnInit {
  readonly id = input.required<string>();

  private readonly customersService = inject(CustomersService);
  private readonly toast = inject(ToastService);

  protected readonly customer  = signal<Customer | null>(null);
  protected readonly isLoading = signal(true);

  ngOnInit(): void {
    this.customersService.getById(this.id()).subscribe({
      next: (c) => {
        this.customer.set(c);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('العميل غير موجود');
        this.isLoading.set(false);
      },
    });
  }

  protected getProgress(): number {
    const c = this.customer();
    if (!c) return 0;
    return Math.round((c.paidInstallments / c.totalInstallments) * 100);
  }

  protected getStatusLabel(status: PaymentStatus): string {
    const map: Record<PaymentStatus, string> = { current: 'ملتزم', late: 'متأخر', defaulted: 'متعثر', new: 'جديد' };
    return map[status];
  }

  protected getStatusBadge(status: PaymentStatus): 'ok' | 'warn' | 'bad' {
    const map: Record<PaymentStatus, 'ok' | 'warn' | 'bad'> = { current: 'ok', late: 'warn', defaulted: 'bad', new: 'ok' };
    return map[status];
  }
}
