import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CustomersService } from '../../services/customers.service';
import { PaymentContractOption, PaymentRecord } from '../../models/customer.model';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, BadgeComponent, CurrencyArPipe],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss',
})
export class PaymentComponent implements OnInit {
  private readonly svc   = inject(CustomersService);
  private readonly toast = inject(ToastService);

  protected readonly paymentContracts   = signal<PaymentContractOption[]>([]);
  protected readonly recentPayments     = signal<PaymentRecord[]>([]);

  protected readonly selectedContractId = signal('');
  protected readonly payAmount          = signal(0);
  protected readonly payMethod          = signal('نقدي');
  protected readonly payDate            = signal(this.todayStr());

  protected readonly paymentInfo = computed(() => {
    const id = this.selectedContractId();
    if (!id) return null;
    const c = this.paymentContracts().find(x => x.id === id);
    if (!c) return null;
    const now = Number(this.payAmount() ?? 0);
    return {
      due:       c.due,
      prevPaid:  c.prevPaid,
      now,
      remaining: Math.max(0, c.due - c.prevPaid - now),
      total:     c.totalDue,
    };
  });

  ngOnInit(): void {
    this.svc.getPaymentContracts().subscribe(r => this.paymentContracts.set(r));
    this.svc.getRecentPayments().subscribe(r => this.recentPayments.set(r));
  }

  protected recordPayment(): void {
    if (!this.selectedContractId()) { this.toast.error('اختر العميل أولاً'); return; }
    const amt = Number(this.payAmount());
    if (!amt || amt <= 0) { this.toast.error('أدخل مبلغاً صحيحاً'); return; }

    this.svc.recordPayment({
      contractId: this.selectedContractId(),
      amount:     amt,
      method:     this.payMethod(),
      date:       this.payDate(),
    }).subscribe({
      next: () => {
        this.toast.success('تم تسجيل الدفعة بنجاح');
        this.selectedContractId.set('');
        this.payAmount.set(0);
        this.svc.getRecentPayments().subscribe(r => this.recentPayments.set(r));
      },
      error: () => this.toast.error('فشل تسجيل الدفعة'),
    });
  }

  protected getStatusLabel(s: PaymentRecord['status']): string {
    const map: Record<PaymentRecord['status'], string> = { complete: 'مكتمل', partial: 'جزئي', remainder: 'تتمة' };
    return map[s];
  }

  protected getStatusBadge(s: PaymentRecord['status']): 'ok' | 'warn' {
    return s === 'partial' ? 'warn' : 'ok';
  }

  private todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }
}
