import {
  ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CustomersService } from '../../services/customers.service';
import { Customer, InstallmentRow, InstallmentStatus } from '../../models/customer.model';
import { BadgeComponent, BadgeType } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-statement',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, BadgeComponent, CurrencyArPipe],
  templateUrl: './statement.component.html',
  styleUrl: './statement.component.scss',
})
export class StatementComponent implements OnInit {
  private readonly svc   = inject(CustomersService);
  private readonly toast = inject(ToastService);

  protected readonly customers             = signal<Customer[]>([]);
  protected readonly statementCustomerId   = signal('');
  protected readonly statementInstallments = signal<InstallmentRow[]>([]);

  protected readonly statementSummary = computed(() => {
    const rows        = this.statementInstallments();
    const totalAmount = rows.reduce((s, r) => s + r.due,  0);
    const paidAmount  = rows.reduce((s, r) => s + r.paid, 0);
    const lateAmount  = rows
      .filter(r => r.status === 'late' || r.status === 'partial')
      .reduce((s, r) => s + r.remaining, 0);
    return { totalAmount, paidAmount, remaining: totalAmount - paidAmount, lateAmount };
  });

  constructor() {
    effect(() => {
      const id = this.statementCustomerId();
      if (id) {
        this.svc.getInstallments(id).subscribe({
          next:  rows => this.statementInstallments.set(rows),
          error: ()   => this.toast.error('فشل تحميل كشف الحساب'),
        });
      } else {
        this.statementInstallments.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.svc.getAll({ limit: 100 }).subscribe(r => this.customers.set(r.data));
  }

  protected getInstallmentLabel(s: InstallmentStatus): string {
    const map: Record<InstallmentStatus, string> = { paid: 'مكتمل', partial: 'جزئي', late: 'متأخر', upcoming: 'قادم' };
    return map[s];
  }

  protected getInstallmentBadge(s: InstallmentStatus): BadgeType {
    const map: Record<InstallmentStatus, BadgeType> = { paid: 'ok', partial: 'warn', late: 'bad', upcoming: 'info' };
    return map[s];
  }
}
