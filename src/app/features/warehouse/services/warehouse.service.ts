import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  CreateWarehousePayload,
  UpdateWarehousePayload,
  Warehouse,
  WarehouseDetailItem,
  WarehouseInventoryItem,
  WarehouseInventoryQuery,
  WarehouseItem,
  WarehouseLocation,
  WarehouseSummary,
} from '../models/warehouse.model';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import { PagedResponse } from '../../../core/models/api-response.model';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';
import { toList } from '../../../core/utils/api-list.util';

const WAREHOUSE_CACHE_KEY = 'warehouse';
const WAREHOUSE_TTL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private readonly api = inject(ApiService);

  // ─────────────────────────────────────────────────────────────────
  //  Live API — /dashboard/warehouses
  // ─────────────────────────────────────────────────────────────────

  list(): Observable<Warehouse[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.warehouses.base, {
        context: withCache({ ttlMs: WAREHOUSE_TTL_MS }),
      })
      .pipe(toList<Warehouse>());
  }

  /** Force-refresh the list, bypassing any cached entry. */
  refreshList(): Observable<Warehouse[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.warehouses.base, {
        context: withCacheBypass(withCache({ ttlMs: WAREHOUSE_TTL_MS })),
      })
      .pipe(toList<Warehouse>());
  }

  getById(id: number): Observable<Warehouse> {
    return this.api.get<Warehouse>(API_ENDPOINTS.warehouses.byId(id), {
      context: withCache({ ttlMs: WAREHOUSE_TTL_MS }),
    });
  }

  create(payload: CreateWarehousePayload): Observable<Warehouse> {
    return this.api.post<Warehouse>(API_ENDPOINTS.warehouses.base, payload, {
      context: withInlineHandling(withCacheInvalidate([WAREHOUSE_CACHE_KEY])),
    });
  }

  update(id: number, payload: UpdateWarehousePayload): Observable<Warehouse> {
    return this.api.put<Warehouse>(
      API_ENDPOINTS.warehouses.byId(id),
      payload,
      {
        context: withInlineHandling(withCacheInvalidate([WAREHOUSE_CACHE_KEY])),
      },
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      API_ENDPOINTS.warehouses.byId(id),
      {
        context: withCacheInvalidate([WAREHOUSE_CACHE_KEY]),
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────
  //  Live API — /dashboard/warehouses/summary
  //  Each row is a warehouse plus aggregate stock + value stats.
  // ─────────────────────────────────────────────────────────────────

  summary(): Observable<WarehouseSummary[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.warehouses.summary, {
        context: withCache({ ttlMs: WAREHOUSE_TTL_MS }),
      })
      .pipe(toList<WarehouseSummary>());
  }

  refreshSummary(): Observable<WarehouseSummary[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.warehouses.summary, {
        context: withCacheBypass(withCache({ ttlMs: WAREHOUSE_TTL_MS })),
      })
      .pipe(toList<WarehouseSummary>());
  }

  // ─────────────────────────────────────────────────────────────────
  //  Live API — /dashboard/warehouses/inventory
  //  Per-warehouse paginated inventory rows (with name search).
  // ─────────────────────────────────────────────────────────────────

  inventory(
    query: WarehouseInventoryQuery,
  ): Observable<PagedResponse<WarehouseInventoryItem>> {
    return this.api.get<PagedResponse<WarehouseInventoryItem>>(
      API_ENDPOINTS.warehouses.inventory,
      {
        params: this.toInventoryParams(query),
        context: withCache({ ttlMs: WAREHOUSE_TTL_MS }),
      },
    );
  }

  refreshInventory(
    query: WarehouseInventoryQuery,
  ): Observable<PagedResponse<WarehouseInventoryItem>> {
    return this.api.get<PagedResponse<WarehouseInventoryItem>>(
      API_ENDPOINTS.warehouses.inventory,
      {
        params: this.toInventoryParams(query),
        context: withCacheBypass(withCache({ ttlMs: WAREHOUSE_TTL_MS })),
      },
    );
  }

  private toInventoryParams(query: WarehouseInventoryQuery): Record<string, unknown> {
    return {
      warehouseId: query.warehouseId,
      PageIndex: query.pageIndex ?? 1,
      PageSize: query.pageSize ?? 10,
      search: query.search ?? '',
    };
  }

  // ─────────────────────────────────────────────────────────────────
  //  Mock data — kept in place until dedicated endpoints land.
  //  Used by the inventory / location / detail tables on the page.
  // ─────────────────────────────────────────────────────────────────

  getAll(): Observable<WarehouseItem[]> {
    return of([...MOCK_ITEMS]).pipe(delay(200));
  }

  getAlerts(): Observable<WarehouseItem[]> {
    return of(MOCK_ITEMS.filter((i) => i.alertLevel !== 'ok')).pipe(delay(200));
  }

  getLocations(): Observable<WarehouseLocation[]> {
    return of([...MOCK_LOCATIONS]).pipe(delay(200));
  }

  getDetailItems(warehouseId: string): Observable<WarehouseDetailItem[]> {
    return of(
      MOCK_DETAIL_ITEMS.filter((i) => i.warehouseId === warehouseId),
    ).pipe(delay(200));
  }
}

const MOCK_ITEMS: WarehouseItem[] = [
  { id: '1', name: 'Samsung Galaxy S25', sku: 'SAM-S25',  category: 'هواتف', currentStock: 15, minStock: 3,  maxStock: 30, unitCost: 600,  alertLevel: 'ok',       lastUpdated: '2025-04-08' },
  { id: '2', name: 'iPhone 15 Pro',      sku: 'APL-15P',  category: 'هواتف', currentStock: 2,  minStock: 3,  maxStock: 20, unitCost: 1400, alertLevel: 'critical',  lastUpdated: '2025-04-05' },
  { id: '3', name: 'Dell XPS 15',        sku: 'DEL-XPS',  category: 'حاسب',  currentStock: 2,  minStock: 2,  maxStock: 10, unitCost: 2000, alertLevel: 'low',       lastUpdated: '2025-04-07' },
  { id: '4', name: 'ثلاجة LG',          sku: 'LG-RF18',  category: 'أجهزة', currentStock: 6,  minStock: 2,  maxStock: 15, unitCost: 700,  alertLevel: 'ok',        lastUpdated: '2025-04-06' },
  { id: '5', name: 'تلفاز Samsung 55"', sku: 'SAM-TV55', category: 'أجهزة', currentStock: 1,  minStock: 2,  maxStock: 12, unitCost: 900,  alertLevel: 'critical',  lastUpdated: '2025-04-08' },
];

const MOCK_LOCATIONS: WarehouseLocation[] = [
  { id: '1', name: 'مخزن الرياض',  city: 'الرياض',  colorVar: '--te', purchased: 120, sold: 98,  available: 22, capacity: 50,  totalValue: 285000, profit: 42000 },
  { id: '2', name: 'مخزن جدة',    city: 'جدة',     colorVar: '--pu', purchased: 80,  sold: 61,  available: 19, capacity: 40,  totalValue: 190000, profit: 28500 },
  { id: '3', name: 'مخزن الدمام', city: 'الدمام',  colorVar: '--am', purchased: 55,  sold: 38,  available: 17, capacity: 30,  totalValue: 125000, profit: 18000 },
];

const MOCK_DETAIL_ITEMS: WarehouseDetailItem[] = [
  // الرياض
  { id: '1', warehouseId: '1', name: 'Samsung Galaxy S25', sku: 'SAM-S25',  category: 'هواتف', serialStart: 'SAM001', serialEnd: 'SAM015', qty: 15, unitCost: 600,  unitPrice: 800  },
  { id: '2', warehouseId: '1', name: 'iPhone 15 Pro',      sku: 'APL-15P',  category: 'هواتف', serialStart: 'APL001', serialEnd: 'APL002', qty: 2,  unitCost: 1400, unitPrice: 1800 },
  { id: '3', warehouseId: '1', name: 'تلفاز Samsung 55"', sku: 'SAM-TV55', category: 'أجهزة', serialStart: 'TV001',  serialEnd: 'TV001',  qty: 1,  unitCost: 900,  unitPrice: 1200 },
  // جدة
  { id: '4', warehouseId: '2', name: 'Dell XPS 15',        sku: 'DEL-XPS',  category: 'حاسب',  serialStart: 'DEL001', serialEnd: 'DEL004', qty: 4,  unitCost: 2000, unitPrice: 2500 },
  { id: '5', warehouseId: '2', name: 'ثلاجة LG',          sku: 'LG-RF18',  category: 'أجهزة', serialStart: 'LG001',  serialEnd: 'LG004',  qty: 4,  unitCost: 700,  unitPrice: 900  },
  // الدمام
  { id: '6', warehouseId: '3', name: 'ثلاجة LG',          sku: 'LG-RF18',  category: 'أجهزة', serialStart: 'LG005',  serialEnd: 'LG006',  qty: 2,  unitCost: 700,  unitPrice: 900  },
  { id: '7', warehouseId: '3', name: 'Samsung Galaxy S25', sku: 'SAM-S25',  category: 'هواتف', serialStart: 'SAM016', serialEnd: 'SAM022', qty: 7,  unitCost: 600,  unitPrice: 800  },
];
