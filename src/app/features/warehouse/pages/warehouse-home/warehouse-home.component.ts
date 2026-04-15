import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { WarehouseService } from '../../services/warehouse.service';
import { StockAlertLevel, WarehouseDetailItem, WarehouseItem, WarehouseLocation } from '../../models/warehouse.model';

@Component({
  selector: 'app-warehouse-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CurrencyArPipe],
  templateUrl: './warehouse-home.component.html',
  styleUrl: './warehouse-home.component.scss',
})
export class WarehouseHomeComponent implements OnInit {
  private readonly svc = inject(WarehouseService);

  protected readonly items           = signal<WarehouseItem[]>([]);
  protected readonly locations       = signal<WarehouseLocation[]>([]);
  protected readonly selectedLocId   = signal<string>('');
  protected readonly detailItems     = signal<WarehouseDetailItem[]>([]);

  protected readonly selectedLoc = computed(() =>
    this.locations().find(l => l.id === this.selectedLocId()) ?? null
  );

  protected readonly totalValue = computed(() =>
    this.locations().reduce((s, l) => s + l.totalValue, 0)
  );

  protected readonly criticalCount = computed(() =>
    this.items().filter(i => i.alertLevel !== 'ok').length
  );

  ngOnInit(): void {
    this.svc.getAll().subscribe(items => this.items.set(items));
    this.svc.getLocations().subscribe(locs => {
      this.locations.set(locs);
      if (locs.length > 0) this.selectLocation(locs[0].id);
    });
  }

  protected selectLocation(id: string): void {
    this.selectedLocId.set(id);
    this.svc.getDetailItems(id).subscribe(items => this.detailItems.set(items));
  }

  protected utilizationPct(loc: WarehouseLocation): number {
    return loc.capacity > 0 ? Math.min(100, Math.round(loc.available / loc.capacity * 100)) : 0;
  }

  protected utilizationColor(pct: number): string {
    if (pct >= 70) return 'var(--gr)';
    if (pct >= 40) return 'var(--am)';
    return 'var(--re)';
  }

  protected margin(item: WarehouseDetailItem): number {
    return item.unitPrice - item.unitCost;
  }

  protected getAlertLabel(level: StockAlertLevel): string {
    const labels: Record<StockAlertLevel, string> = { ok: 'كافٍ', low: 'منخفض', critical: 'حرج' };
    return labels[level];
  }

  protected getAlertBadge(level: StockAlertLevel): 'ok' | 'warn' | 'bad' {
    const map: Record<StockAlertLevel, 'ok' | 'warn' | 'bad'> = { ok: 'ok', low: 'warn', critical: 'bad' };
    return map[level];
  }
}
