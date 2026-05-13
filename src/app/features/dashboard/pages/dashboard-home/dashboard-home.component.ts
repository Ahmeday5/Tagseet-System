import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import {
  ClientRating,
  DueInstallmentDto,
  HomeSummaryDto,
  ProfitMonthDto,
  TopClientDto,
} from '../../models/dashboard.model';
import { FinancialService } from '../../services/financial.service';
import { FinancialSeparation } from '../../models/financial.model';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';
import {
  BadgeComponent,
  BadgeType,
} from '../../../../shared/components/badge/badge.component';
@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CurrencyArPipe, BadgeComponent, DecimalPipe],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent implements OnInit {
  private readonly dashService = inject(DashboardService);
  private readonly financialService = inject(FinancialService);
  private readonly cache = inject(HttpCacheService);

  // ── live home widgets ──
  protected readonly profitMonths = signal<ProfitMonthDto[]>([]);
  protected readonly topClients = signal<TopClientDto[]>([]);
  protected readonly dueInstallments = signal<DueInstallmentDto[]>([]);

  // ── financial-separation block ──
  protected readonly financial = signal<FinancialSeparation | null>(null);
  protected readonly financialLoading = signal(false);
  protected readonly summary = signal<HomeSummaryDto | null>(null);
  protected readonly summaryLoading = signal(false);

  private readonly maxProfit = computed(() => {
    const months = this.profitMonths();
    return months.length
      ? Math.max(...months.map((m) => m.profitAmount), 1)
      : 1;
  });

  /** Last entry in the array — the API orders them oldest-to-newest. */
  protected readonly currentMonth = computed(() => {
    const months = this.profitMonths();
    return months.length ? months[months.length - 1] : null;
  });

  /** Second-to-last entry, for the month-over-month comparison strip. */
  protected readonly previousMonth = computed(() => {
    const months = this.profitMonths();
    return months.length > 1 ? months[months.length - 2] : null;
  });

  protected readonly profitDeltaPct = computed(() => {
    const cur = this.currentMonth();
    const prev = this.previousMonth();
    if (!cur || !prev || !prev.profitAmount) return null;
    return ((cur.profitAmount - prev.profitAmount) / prev.profitAmount) * 100;
  });

  protected readonly profitGridTicks = computed(() => {
    const max = this.maxProfit();
    return [1, 0.75, 0.5, 0.25, 0].map((r) => max * r);
  });

  readonly totalAssets = computed(() => {
    const f = this.financial();
    if (!f) return 0;
    return (f.treasury ?? 0) + (f.receivables ?? 0) + (f.inventoryValue ?? 0);
  });

  readonly coverageRatio = computed(() => {
    const f = this.financial();
    if (!f || !f.payables) return null;
    return this.totalAssets() / f.payables;
  });

  constructor() {
    onInvalidate(this.cache, 'treasur', () => this.loadFinancial(true));
    onInvalidate(this.cache, 'invoice', () => this.loadFinancial(true));
    onInvalidate(this.cache, 'payment', () => this.loadFinancial(true));
    onInvalidate(this.cache, 'contract', () => this.loadHomeWidgets(true));
    onInvalidate(this.cache, 'client', () => this.loadHomeWidgets(true));
    onInvalidate(this.cache, 'installment', () => this.loadHomeWidgets(true));
    onInvalidate(this.cache, 'payment', () => this.loadHomeWidgets(true));
    onInvalidate(this.cache, 'payment', () => this.loadSummary(true));
    onInvalidate(this.cache, 'contract', () => this.loadSummary(true));
    onInvalidate(this.cache, 'invoice', () => this.loadSummary(true));
    onInvalidate(this.cache, 'client', () => this.loadSummary(true));
  }

  ngOnInit(): void {
    this.loadFinancial(false);
    this.loadHomeWidgets(false);
    this.loadSummary(false);
  }

  private loadSummary(force: boolean): void {
    this.summaryLoading.set(true);
    const stream$ = force
      ? this.dashService.refreshHomeSummary()
      : this.dashService.homeSummary();

    stream$.subscribe({
      next: (res) => {
        this.summary.set(res);
        this.summaryLoading.set(false);
      },
      error: () => {
        this.summaryLoading.set(false);
      },
    });
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

  private loadHomeWidgets(force: boolean): void {
    const profits$ = force
      ? this.dashService.refreshProfitsLast6Months()
      : this.dashService.profitsLast6Months();
    const clients$ = force
      ? this.dashService.refreshTopClientsThisMonth()
      : this.dashService.topClientsThisMonth();
    const installments$ = force
      ? this.dashService.refreshInstallmentsDueThisWeek()
      : this.dashService.installmentsDueThisWeek();

    profits$.subscribe({
      next: (rows) => this.profitMonths.set(rows),
      error: () => {},
    });
    clients$.subscribe({
      next: (rows) => this.topClients.set(rows),
      error: () => {},
    });
    installments$.subscribe({
      next: (rows) => this.dueInstallments.set(rows),
      error: () => {},
    });
  }

  protected refreshFinancial(): void {
    this.loadFinancial(true);
  }

  protected getBarHeight(amount: number): number {
    return Math.round((amount / this.maxProfit()) * 85) + 10;
  }

  /** The last month returned by the API is "this month" — we highlight it differently. */
  protected isCurrentMonth(index: number): boolean {
    return index === this.profitMonths().length - 1;
  }

  protected ratingBadge(rating: ClientRating): BadgeType {
    switch ((rating ?? '').toUpperCase()) {
      case 'A':
        return 'ok';
      case 'B':
        return 'warn';
      case 'C':
      case 'D':
        return 'bad';
      default:
        return 'info';
    }
  }

  protected formatProfitTick(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(Math.round(n));
  }

  protected statusBadge(status: string): BadgeType {
    const s = (status ?? '').trim();
    if (s.includes('متأخر')) return 'bad';
    if (s.includes('قريب')) return 'warn';
    if (s.includes('منتظم')) return 'ok';
    return 'info';
  }
}
