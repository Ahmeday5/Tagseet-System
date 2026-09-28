import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BalanceView } from '../../models/balance-view.model';
import { BalanceAmountPipe } from '../../pipes/balance-amount.pipe';

const RATIO_FORMAT = new Intl.NumberFormat('ar-EG', { maximumSignificantDigits: 3 });

/**
 * Headline verdict of the trial balance: the equation
 * assets − obligations = difference, a side-by-side magnitude comparison,
 * and — when the two sides disagree — the known structural causes.
 */
@Component({
  selector: 'app-balance-status-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BalanceAmountPipe],
  templateUrl: './balance-status-hero.component.html',
  styleUrl: './balance-status-hero.component.scss',
})
export class BalanceStatusHeroComponent {
  readonly view = input.required<BalanceView>();

  protected readonly assetsTotal = computed(() => this.view().assets.total);
  protected readonly obligationsTotal = computed(() => this.view().obligations.total);

  /** Bar widths relative to the larger side. */
  protected readonly bars = computed(() => {
    const a = Math.max(this.assetsTotal(), 0);
    const o = Math.max(this.obligationsTotal(), 0);
    const max = Math.max(a, o);
    return {
      assets: max > 0 ? (a / max) * 100 : 0,
      obligations: max > 0 ? (o / max) * 100 : 0,
    };
  });

  protected readonly direction = computed(() => {
    const d = this.view().difference;
    if (this.view().isBalanced) return 'الأصول تساوي الالتزامات تمامًا';
    return d > 0 ? 'الأصول أكبر من الالتزامات' : 'الالتزامات أكبر من الأصول';
  });

  /** |difference| as a share of assets — tiny, so show significant digits. */
  protected readonly ratioText = computed(() => {
    const base = Math.abs(this.assetsTotal());
    if (!(base > 0)) return null;
    const pct = (Math.abs(this.view().difference) / base) * 100;
    return `${RATIO_FORMAT.format(pct)}%`;
  });
}
