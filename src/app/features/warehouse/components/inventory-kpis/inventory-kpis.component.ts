import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { WarehouseInventoryTotals } from '../../models/warehouse.model';

/**
 * Headline figures for the inventory currently in scope (the same filters
 * as the details table). Purely presentational — the page owns fetching.
 */
@Component({
  selector: 'app-inventory-kpis',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, CurrencyArPipe],
  templateUrl: './inventory-kpis.component.html',
  styleUrl: './inventory-kpis.component.scss',
})
export class InventoryKpisComponent {
  readonly totals = input<WarehouseInventoryTotals | null>(null);
  readonly loading = input(false);

  /** Profit as a share of sales revenue; `null` when nothing was sold. */
  protected readonly marginPercent = computed(() => {
    const t = this.totals();
    return t && t.salesValue > 0 ? (t.totalProfit / t.salesValue) * 100 : null;
  });

  /** Sold units as a share of purchased units (0 → 100). */
  protected readonly soldPercent = computed(() => {
    const t = this.totals();
    return t && t.purchasedQuantity > 0
      ? Math.min(100, (t.soldQuantity / t.purchasedQuantity) * 100)
      : 0;
  });
}
