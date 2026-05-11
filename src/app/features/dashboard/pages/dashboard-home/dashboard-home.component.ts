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
import { FinancialService } from '../../services/financial.service';
import { FinancialSeparation } from '../../models/financial.model';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';
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
  private readonly financialService = inject(FinancialService);
  private readonly toast = inject(ToastService);
  private readonly cache = inject(HttpCacheService);

  protected readonly data = signal<DashboardData | null>(null);

  // ── financial-separation block ──
  protected readonly financial = signal<FinancialSeparation | null>(null);
  protected readonly financialLoading = signal(false);

  @ViewChild('ratingTpl') ratingTpl!: TemplateRef<any>;
  @ViewChild('statusTpl') statusTpl!: TemplateRef<any>;

  readonly stats = computed(() => this.data()?.stats);
  readonly profitChart = computed(() => this.data()?.profitChart ?? []);
  readonly topCustomers = computed(() => this.data()?.topCustomers ?? []);

  /**
   * `treasury + receivables + inventoryValue` — the gross side of the
   * net position equation. Surfaced as a single derived number so the
   * UI can show payables side-by-side with what backs them.
   */
  readonly totalAssets = computed(() => {
    const f = this.financial();
    if (!f) return 0;
    return (f.treasury ?? 0) + (f.receivables ?? 0) + (f.inventoryValue ?? 0);
  });

  /**
   * `assets / payables` ratio — anything < 1 means short-term liabilities
   * exceed what's available to cover them. Returns `null` when there are
   * no payables at all (the ratio is undefined).
   */
  readonly coverageRatio = computed(() => {
    const f = this.financial();
    if (!f || !f.payables) return null;
    return this.totalAssets() / f.payables;
  });

  constructor() {
    // Refresh the financial block whenever an invoice / treasury /
    // payment mutation invalidates anything financial — keeps the
    // hero numbers honest across the rest of the app.
    onInvalidate(this.cache, 'treasur', () => this.loadFinancial(true));
    onInvalidate(this.cache, 'invoice', () => this.loadFinancial(true));
    onInvalidate(this.cache, 'payment', () => this.loadFinancial(true));
  }

  ngOnInit(): void {
    this.dashService.getDashboardData().subscribe({
      next: (d) => this.data.set(d),
      error: () => this.toast.error('فشل تحميل بيانات لوحة التحكم'),
    });
    this.loadFinancial(false);
  }

  private loadFinancial(force: boolean): void {
    this.financialLoading.set(true);
    const stream$ = force
      ? this.financialService.refreshSeparation()
      : this.financialService.separation();
    stream$.subscribe({
      next: (f) => {
        this.financial.set(f);
        this.financialLoading.set(false);
      },
      error: () => {
        this.financialLoading.set(false);
      },
    });
  }

  protected refreshFinancial(): void {
    this.loadFinancial(true);
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
      amount: '800 ج.م',
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
      amount: '450 ج.م',
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
