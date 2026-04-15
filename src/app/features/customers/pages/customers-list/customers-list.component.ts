import {
  ChangeDetectionStrategy, Component, inject, OnInit, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CustomersService } from '../../services/customers.service';
import { Customer, CreditScore, PaymentStatus } from '../../models/customer.model';
import { BadgeComponent, BadgeType } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { CustomerFormComponent } from '../../components/customer-form/customer-form.component';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, BadgeComponent, CurrencyArPipe, CustomerFormComponent],
  templateUrl: './customers-list.component.html',
  styleUrl: './customers-list.component.scss',
})
export class CustomersListComponent implements OnInit {
  private readonly svc    = inject(CustomersService);
  private readonly toast  = inject(ToastService);
  private readonly dialog = inject(DialogService);

  protected readonly customers    = signal<Customer[]>([]);
  protected readonly total        = signal(0);
  protected readonly totalPages   = signal(1);
  protected readonly currentPage  = signal(1);
  protected readonly isLoading    = signal(false);
  protected readonly showForm     = signal(false);
  protected readonly searchQuery  = signal('');
  protected readonly statusFilter = signal('');
  protected readonly scoreFilter  = signal('');
  protected readonly pages        = signal<number[]>([]);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.loadCustomers(); }

  protected loadCustomers(): void {
    this.isLoading.set(true);
    this.svc.getAll({
      page:        this.currentPage(),
      limit:       10,
      search:      this.searchQuery()  || undefined,
      status:      this.statusFilter() || undefined,
      creditScore: this.scoreFilter()  || undefined,
    }).subscribe({
      next: (res) => {
        this.customers.set(res.data);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.pages.set(Array.from({ length: res.totalPages }, (_, i) => i + 1));
        this.isLoading.set(false);
      },
      error: () => { this.toast.error('فشل تحميل العملاء'); this.isLoading.set(false); },
    });
  }

  protected onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.currentPage.set(1); this.loadCustomers(); }, 350);
  }

  protected goToPage(p: number): void { this.currentPage.set(p); this.loadCustomers(); }

  protected async deleteCustomer(c: Customer): Promise<void> {
    const ok = await this.dialog.confirm({
      title:   'حذف العميل',
      message: `هل أنت متأكد من حذف "${c.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      type:    'danger',
    });
    if (!ok) return;
    this.svc.delete(c.id).subscribe({
      next:  () => { this.toast.success(`تم حذف "${c.name}"`); this.loadCustomers(); },
      error: () => this.toast.error('فشل الحذف'),
    });
  }

  protected getProgress(c: Customer): number {
    return Math.round((c.paidInstallments / c.totalInstallments) * 100);
  }

  protected getStatusLabel(s: PaymentStatus): string {
    const map: Record<PaymentStatus, string> = { current: 'منتظم', late: 'متأخر', defaulted: 'متعثر', new: 'جديد' };
    return map[s];
  }

  protected getStatusBadge(s: PaymentStatus): BadgeType {
    const map: Record<PaymentStatus, BadgeType> = { current: 'ok', late: 'warn', defaulted: 'bad', new: 'info' };
    return map[s];
  }

  protected getCreditColor(s: CreditScore): string {
    const map: Record<CreditScore, string> = { A: 'var(--gr)', B: 'var(--bl)', C: 'var(--am)', D: 'var(--re)' };
    return map[s];
  }

  protected getProgressColor(c: Customer): string {
    const map: Record<PaymentStatus, string> = { current: 'var(--gr)', new: 'var(--bl)', late: 'var(--am)', defaulted: 'var(--re)' };
    return map[c.paymentStatus];
  }
}
