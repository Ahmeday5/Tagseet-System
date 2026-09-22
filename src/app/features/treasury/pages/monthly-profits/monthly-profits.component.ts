import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MonthlyProfit } from '../../models/treasury.model';
import { TreasuryService } from '../../services/treasury.service';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { PrintService } from '../../../../core/services/print.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';

@Component({
  selector: 'app-monthly-profits',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, BadgeComponent, CurrencyArPipe],
  templateUrl: './monthly-profits.component.html',
  styleUrl: './monthly-profits.component.scss',
})
export class MonthlyProfitsComponent implements OnInit {
  private readonly treasuryService = inject(TreasuryService);
  private readonly cache = inject(HttpCacheService);
  private readonly printer = inject(PrintService);

  protected readonly monthlyProfits = signal<MonthlyProfit[]>([]);
  protected readonly monthlyProfitsLoading = signal(false);
  protected readonly selectedYear = signal<number | null>(null);
  protected readonly isPrintingMonthlyProfits = signal(false);

  private monthlyProfitsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    onInvalidate(this.cache, 'treasur', () =>
      this.fetchMonthlyProfits(this.selectedYear(), true),
    );

    effect(() => {
      const year = this.selectedYear();
      if (this.monthlyProfitsDebounceTimer) {
        clearTimeout(this.monthlyProfitsDebounceTimer);
      }
      this.monthlyProfitsDebounceTimer = setTimeout(
        () => this.fetchMonthlyProfits(year, false),
        200,
      );
    });
  }

  ngOnInit(): void {
    this.loadMonthlyProfits();
  }

  protected loadMonthlyProfits(): void {
    this.fetchMonthlyProfits(null, false);
  }

  private fetchMonthlyProfits(year: number | null, force: boolean): void {
    this.monthlyProfitsLoading.set(true);
    const stream$ = force
      ? this.treasuryService.refreshMonthlyProfits(year ?? undefined)
      : this.treasuryService.listMonthlyProfits(year ?? undefined);

    stream$.subscribe({
      next: (data) => {
        this.monthlyProfits.set(data ?? []);
        this.monthlyProfitsLoading.set(false);
      },
      error: () => {
        this.monthlyProfits.set([]);
        this.monthlyProfitsLoading.set(false);
      },
    });
  }

  protected refreshMonthlyProfits(): void {
    this.fetchMonthlyProfits(this.selectedYear(), true);
  }

  protected onYearChange(value: string): void {
    this.selectedYear.set(value === '' ? null : Number(value));
  }

  protected profitClass(profit: number): string {
    return profit > 0 ? 'mp-positive' : profit < 0 ? 'mp-negative' : 'mp-neutral';
  }

  protected marginClass(margin: number): string {
    if (margin >= 30) return 'mp-margin-excellent';
    if (margin >= 20) return 'mp-margin-good';
    if (margin >= 10) return 'mp-margin-fair';
    return 'mp-margin-low';
  }

  protected monthRowClass(isCurrentMonth: boolean): string {
    return isCurrentMonth ? 'mp-current-month' : '';
  }

  private formatCurrencyTotal(value: number): string {
    return `${Math.round(value).toLocaleString('ar-EG')} ج.م`;
  }

  protected printMonthlyProfits(): void {
    if (this.isPrintingMonthlyProfits()) return;
    const rows = this.monthlyProfits();
    if (rows.length === 0) return;
    this.isPrintingMonthlyProfits.set(true);

    const totalRevenue = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
    const totalExpenses = rows.reduce((s, r) => s + (r.expenses ?? 0), 0);
    const totalProfit = totalRevenue - totalExpenses;
    const margin =
      totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;

    this.printer.print<MonthlyProfit>({
      title: 'الأرباح الشهرية',
      subtitle: this.selectedYear()
        ? `بيانات سنة ${this.selectedYear()}`
        : 'ملخص الإيرادات والمصروفات وصافي الربح لكل شهر',
      columns: [
        { key: 'monthName', header: 'الشهر', align: 'start', bold: true },
        { key: 'revenue', header: 'الإيرادات', align: 'end', format: 'currency' },
        { key: 'expenses', header: 'المصروفات', align: 'end', format: 'currency' },
        {
          key: 'profit',
          header: 'صافي الربح',
          align: 'end',
          format: 'currency',
          bold: true,
        },
        {
          key: 'marginPercent',
          header: 'هامش الربح',
          align: 'center',
          format: 'percent',
        },
        {
          key: (m) => m,
          header: 'الحالة',
          align: 'center',
          format: (_v, m) => (m.profit > 0 ? 'ربح' : m.profit < 0 ? 'خسارة' : 'تعادل'),
        },
      ],
      totals: {
        label: 'الإجمالي',
        cells: [
          this.formatCurrencyTotal(totalRevenue),
          this.formatCurrencyTotal(totalExpenses),
          this.formatCurrencyTotal(totalProfit),
          `${margin}%`,
          totalProfit > 0 ? 'ربح' : totalProfit < 0 ? 'خسارة' : 'تعادل',
        ],
      },
      rows,
    });
    this.isPrintingMonthlyProfits.set(false);
  }
}
