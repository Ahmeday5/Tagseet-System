import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardData } from '../../models/dashboard.model';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { computed } from '@angular/core';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { TableColumn } from '../../../../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatCardComponent, CurrencyArPipe, BadgeComponent],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent implements OnInit {
  private readonly dashService = inject(DashboardService);
  private readonly toast = inject(ToastService);
  protected readonly data = signal<DashboardData | null>(null);
  @ViewChild('ratingTpl') ratingTpl!: TemplateRef<any>;
  @ViewChild('statusTpl') statusTpl!: TemplateRef<any>;

  readonly stats = computed(() => this.data()?.stats);
  readonly profitChart = computed(() => this.data()?.profitChart ?? []);
  readonly topCustomers = computed(() => this.data()?.topCustomers ?? []);

  ngOnInit(): void {
    this.dashService.getDashboardData().subscribe({
      next: (d) => this.data.set(d),
      error: () => this.toast.error('فشل تحميل بيانات لوحة التحكم'),
    });
  }

  ngAfterViewInit() {
    this.columns = [
      { key: 'customer', label: 'العميل' },
      { key: 'product', label: 'البضاعة' },
      { key: 'rating', label: 'التقييم', cellTemplate: this.ratingTpl },
      { key: 'status', label: 'الحالة', cellTemplate: this.statusTpl },
    ];
  }

  installments = [
    {
      id: 1,
      customer: 'خالد العمري',
      product: 'Samsung S25',
      installment: '4/12',
      amount: '800 ر.س',
      dueDate: '10 أبريل',
      paymentType: 'شهري',
      remaining: '7200',
      rating: 'A',
      status: 'قريب',
    },
    {
      id: 2,
      customer: 'سارة الغامدي',
      product: 'ثلاجة LG',
      installment: '2/24',
      amount: '450 ر.س',
      dueDate: '8 أبريل',
      paymentType: 'شهري',
      remaining: '10350',
      rating: 'C',
      status: 'متأخر',
    },
  ];

  columns: TableColumn[] = [
    { key: 'customer', label: 'العميل' },
    { key: 'product', label: 'البضاعة' },
    { key: 'installment', label: 'القسط' },
    { key: 'amount', label: 'المبلغ' },
    { key: 'dueDate', label: 'الاستحقاق' },
    { key: 'paymentType', label: 'نوع الدفع' },
    { key: 'remaining', label: 'الباقي' },
    { key: 'rating', label: 'التقييم' },
    { key: 'status', label: 'الحالة' },
  ];

  topCustomerColumns: TableColumn[] = [
    { key: 'rank', label: '#' },
    { key: 'name', label: 'العميل' },
    { key: 'paid', label: 'المدفوع' },
    { key: 'creditScore', label: 'التقييم' },
  ];

  protected getRatingPercent(): number {
    const stats = this.data()?.stats;
    if (!stats) return 0;
    return Math.round((stats.ratingACount / stats.totalCustomers) * 100);
  }

  protected getBarHeight(amount: number): number {
    const max = Math.max(
      ...(this.data()?.profitChart.map((e) => e.amount) ?? [1]),
    );
    return Math.round((amount / max) * 85) + 10;
  }

  protected formatK(value: number): string {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
  }
}
