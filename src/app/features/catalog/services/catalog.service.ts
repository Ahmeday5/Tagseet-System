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
} from '../models/catalog.model';

const CLIENT_ORDERS_CACHE_KEY = 'client-orders';
const CLIENT_ORDERS_TTL_MS = 60 * 1000;

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
}
