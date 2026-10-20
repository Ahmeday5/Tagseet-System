import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import {
  WarehouseInventoryTotals,
  WarehouseInventoryTotalsRow,
} from '../../models/warehouse.model';

/**
 * Per-warehouse comparison of the inventory totals, with a grand-total
 * footer. Clicking a warehouse asks the page to scope the details table
 * to it. Purely presentational — the page owns fetching and filters.
 */
@Component({
  selector: 'app-inventory-totals-breakdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, NgTemplateOutlet, CurrencyArPipe],
  templateUrl: './inventory-totals-breakdown.component.html',
  styleUrl: './inventory-totals-breakdown.component.scss',
})
export class InventoryTotalsBreakdownComponent {
  readonly rows = input.required<WarehouseInventoryTotalsRow[]>();
  readonly grandTotal = input<WarehouseInventoryTotals | null>(null);
  readonly loading = input(false);

  readonly warehouseSelect = output<number>();

  protected soldPercent(t: WarehouseInventoryTotals): number {
    return t.purchasedQuantity > 0
      ? Math.min(100, (t.soldQuantity / t.purchasedQuantity) * 100)
      : 0;
  }
}
