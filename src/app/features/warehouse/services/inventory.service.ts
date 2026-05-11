import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCache,
  withCacheBypass,
} from '../../../core/http/http-context.tokens';
import {
  InventoryAlertItem,
  InventoryAlertSummary,
  InventoryAlertsQuery,
  InventoryAlertsResponse,
} from '../models/warehouse.model';

const INVENTORY_ALERTS_TTL_MS = 2 * 60 * 1000; // 2 min — stock turns over fast

const EMPTY_SUMMARY: InventoryAlertSummary = {
  outOfStockCount: 0,
  criticalCount: 0,
  monitoringCount: 0,
};


@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly api = inject(ApiService);

  /**
   * Stock-alert list, optionally narrowed to a single severity level.
   * The backend returns the data wrapped in the standard envelope; the
   * `ApiService` unwraps it to `InventoryAlertsResponse`.
   */
  alerts(query: InventoryAlertsQuery = {}): Observable<InventoryAlertsResponse> {
    return this.api
      .get<InventoryAlertsResponse>(API_ENDPOINTS.inventory.alerts, {
        params: this.toParams(query),
        context: withCache({ ttlMs: INVENTORY_ALERTS_TTL_MS }),
      })
      .pipe(map((res) => this.normalize(res)));
  }

  /** User-driven refresh — bypasses the in-memory cache. */
  refreshAlerts(
    query: InventoryAlertsQuery = {},
  ): Observable<InventoryAlertsResponse> {
    return this.api
      .get<InventoryAlertsResponse>(API_ENDPOINTS.inventory.alerts, {
        params: this.toParams(query),
        context: withCacheBypass(withCache({ ttlMs: INVENTORY_ALERTS_TTL_MS })),
      })
      .pipe(map((res) => this.normalize(res)));
  }

  // ─────────── helpers ───────────

  private toParams(query: InventoryAlertsQuery): Record<string, unknown> {
    return {
      level: query.level ?? undefined,
    };
  }

  /** Defend against null payloads / partial envelopes so the page never crashes. */
  private normalize(
    res: InventoryAlertsResponse | null | undefined,
  ): InventoryAlertsResponse {
    return {
      summary: res?.summary ?? EMPTY_SUMMARY,
      alerts: this.sortAlerts(res?.alerts ?? []),
    };
  }

  /**
   * Bring the most urgent rows to the top — the API returns Sufficient
   * items first, which buries any actual problem far down the page.
   */
  private sortAlerts(alerts: InventoryAlertItem[]): InventoryAlertItem[] {
    const order: Record<string, number> = {
      OutOfStock: 0,
      Critical: 1,
      NeedsMonitoring: 2,
      Sufficient: 3,
    };
    return [...alerts].sort((a, b) => {
      const ra = order[a.level] ?? 99;
      const rb = order[b.level] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.totalQuantity - b.totalQuantity;
    });
  }
}
