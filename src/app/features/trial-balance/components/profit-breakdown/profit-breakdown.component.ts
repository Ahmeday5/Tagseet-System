import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BalanceProfit } from '../../models/balance-check.model';
import { BalanceAmountPipe } from '../../pipes/balance-amount.pipe';
import { computeNetProfit, isProfitClamped } from '../../utils/balance-view.builder';

interface ProfitStep {
  readonly label: string;
  readonly hint: string;
  readonly amount: number;
  readonly sign: 1 | -1;
  /** Bar width relative to the largest step, 0‒100. */
  readonly width: number;
}

/**
 * Waterfall of how the obligations-side profit figure is derived:
 * gross contracts profit + revenues − expenses − distributed − commission.
 */
@Component({
  selector: 'app-profit-breakdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BalanceAmountPipe],
  templateUrl: './profit-breakdown.component.html',
  styleUrl: './profit-breakdown.component.scss',
})
export class ProfitBreakdownComponent {
  readonly profit = input.required<BalanceProfit>();

  protected readonly steps = computed<readonly ProfitStep[]>(() => {
    const p = this.profit();
    const raw: Omit<ProfitStep, 'width'>[] = [
      { label: 'ربح العقود', hint: 'إجمالي هامش الربح على عقود التقسيط', amount: p.grossContractsProfit, sign: 1 },
      { label: 'الإيرادات', hint: 'الإيرادات الأخرى المسجلة', amount: p.revenues, sign: 1 },
      { label: 'المصروفات', hint: 'المصروفات التشغيلية', amount: p.expenses, sign: -1 },
      { label: 'الأرباح الموزعة', hint: 'حصص المساهمين المخصومة عند التوزيع', amount: p.distributedProfit, sign: -1 },
      { label: 'عمولة المناديب', hint: 'العمولات المستحقة للمناديب', amount: p.representativeCommission, sign: -1 },
    ];
    const max = Math.max(...raw.map((s) => Math.abs(s.amount)), 0);
    return raw.map((s) => ({
      ...s,
      width: max > 0 ? Math.max(Math.abs(s.amount) / max * 100, s.amount ? 1.5 : 0) : 0,
    }));
  });

  protected readonly netProfit = computed(() => computeNetProfit(this.profit()));
  protected readonly clamped = computed(() => isProfitClamped(this.profit()));
}
