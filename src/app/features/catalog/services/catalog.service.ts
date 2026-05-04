import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
  withCache,
} from '../../../core/http/http-context.tokens';
import {
  ClientOrder,
  ConvertToContractPayload,
  Product,
} from '../models/catalog.model';

const CLIENT_ORDERS_CACHE_KEY = 'client-orders';
const CLIENT_ORDERS_TTL_MS = 60 * 1000; // 1 min — list churns with each action

/**
 * Catalog page data sources.
 *
 *   - Products grid: still mock-backed (no dedicated endpoint yet — the
 *     warehouse / inventory work delivers this in a later pass).
 *   - Pending client orders: live API at /dashboard/client-orders, with
 *     reject + convert-to-contract mutations that invalidate the list.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiService);

  // ─────────────────────────────────────────────────────────────────
  //  Live API — /dashboard/client-orders
  // ─────────────────────────────────────────────────────────────────

  /** All client orders (caller filters by status as needed). */
  listClientOrders(): Observable<ClientOrder[]> {
    return this.api.get<ClientOrder[]>(API_ENDPOINTS.clientOrders.base, {
      context: withCache({ ttlMs: CLIENT_ORDERS_TTL_MS }),
    });
  }

  /** Force-refresh, bypassing the cache (used after manual reload). */
  refreshClientOrders(): Observable<ClientOrder[]> {
    return this.api.get<ClientOrder[]>(API_ENDPOINTS.clientOrders.base, {
      context: withCacheBypass(withCache({ ttlMs: CLIENT_ORDERS_TTL_MS })),
    });
  }

  rejectClientOrder(id: number): Observable<{ message?: string }> {
    return this.api.post<{ message?: string }>(
      API_ENDPOINTS.clientOrders.reject(id),
      {},
      {
        context: withInlineHandling(
          withCacheInvalidate([CLIENT_ORDERS_CACHE_KEY]),
        ),
      },
    );
  }

  convertClientOrderToContract(
    id: number,
    payload: ConvertToContractPayload,
  ): Observable<unknown> {
    return this.api.post<unknown>(
      API_ENDPOINTS.clientOrders.convertToContract(id),
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([CLIENT_ORDERS_CACHE_KEY]),
        ),
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────
  //  Mock — products grid (until a dedicated endpoint lands)
  // ─────────────────────────────────────────────────────────────────

  getAll(): Observable<Product[]> {
    return of([...MOCK_PRODUCTS]).pipe(delay(150));
  }
}

const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Samsung S25',  category: 'هواتف', price: 1200, costPrice: 800,  stock: 8, minStock: 3, sku: 'SAM-S25',  warehouseName: 'الرياض', serialLabel: 'SS25-001...008' },
  { id: '2', name: 'iPhone 15',    category: 'هواتف', price: 2800, costPrice: 1800, stock: 5, minStock: 2, sku: 'APL-15',   warehouseName: 'الرياض', serialLabel: 'IP15-001...005' },
  { id: '3', name: 'Dell XPS',     category: 'حاسب',  price: 3500, costPrice: 2500, stock: 2, minStock: 2, sku: 'DEL-XPS',  warehouseName: 'الرياض', serialLabel: 'DX15-001...002' },
  { id: '4', name: 'ثلاجة LG',    category: 'أجهزة', price: 1350, costPrice: 900,  stock: 1, minStock: 2, sku: 'LG-RF',    warehouseName: 'جدة',    serialLabel: 'LG-F01' },
  { id: '5', name: 'غسالة Bosch', category: 'أجهزة', price: 1050, costPrice: 700,  stock: 4, minStock: 2, sku: 'BO-W',     warehouseName: 'جدة',    serialLabel: 'BO-W01...004' },
  { id: '6', name: 'MacBook Air',  category: 'حاسب',  price: 5200, costPrice: 3500, stock: 3, minStock: 2, sku: 'MB-A',     warehouseName: 'الدمام', serialLabel: 'MB-A01...003' },
];
