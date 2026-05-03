import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Treasury,
  CreateTreasuryPayload,
  UpdateTreasuryPayload,
} from '../models/treasury.model';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';

const TREASURY_CACHE_KEY = 'treasury';
const TREASURY_TTL_MS = 15 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class TreasuryService {
  private readonly api = inject(ApiService);

  list(): Observable<Treasury[]> {
    return this.api.get<Treasury[]>(API_ENDPOINTS.treasuries.base, {
      context: withCache({ ttlMs: TREASURY_TTL_MS }),
    });
  }

  /** Force-refresh the list, bypassing any cached entry. */
  refreshList(): Observable<Treasury[]> {
    return this.api.get<Treasury[]>(API_ENDPOINTS.treasuries.base, {
      context: withCacheBypass(withCache({ ttlMs: TREASURY_TTL_MS })),
    });
  }

  getById(id: number): Observable<Treasury> {
    return this.api.get<Treasury>(API_ENDPOINTS.treasuries.byId(id), {
      context: withCache({ ttlMs: TREASURY_TTL_MS }),
    });
  }

  create(payload: CreateTreasuryPayload): Observable<Treasury> {
    return this.api.post<Treasury>(API_ENDPOINTS.treasuries.base, payload, {
      context: withInlineHandling(withCacheInvalidate([TREASURY_CACHE_KEY])),
    });
  }

  update(id: number, payload: UpdateTreasuryPayload): Observable<Treasury> {
    return this.api.put<Treasury>(API_ENDPOINTS.treasuries.byId(id), payload, {
      context: withInlineHandling(withCacheInvalidate([TREASURY_CACHE_KEY])),
    });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      API_ENDPOINTS.treasuries.byId(id),
      {
        context: withCacheInvalidate([TREASURY_CACHE_KEY]),
      },
    );
  }
}
