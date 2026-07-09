import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';
import {
  CreateRevenuePayload,
  RevenueDto,
  RevenuesQuery,
  RevenuesResponse,
} from '../models/revenue.model';

/**
 * Recording a revenue tops up a treasury (and the profits treasury via the
 * backend's automatic distribution), so writes invalidate both scopes.
 */
const REVENUES_CACHE_KEYS = ['revenues', 'treasur'] as const;

const REVENUES_TTL_MS = 60 * 1000;

@Injectable({ providedIn: 'root' })
export class RevenuesService {
  private readonly api = inject(ApiService);

  list(query: RevenuesQuery = {}): Observable<RevenuesResponse> {
    return this.api.get<RevenuesResponse>(API_ENDPOINTS.revenues.base, {
      params: this.toParams(query),
      context: withCache({ ttlMs: REVENUES_TTL_MS }),
    });
  }

  /** User-driven refresh — bypasses the in-memory cache. */
  refresh(query: RevenuesQuery = {}): Observable<RevenuesResponse> {
    return this.api.get<RevenuesResponse>(API_ENDPOINTS.revenues.base, {
      params: this.toParams(query),
      context: withCacheBypass(withCache({ ttlMs: REVENUES_TTL_MS })),
    });
  }

  create(payload: CreateRevenuePayload): Observable<RevenueDto> {
    return this.api.post<RevenueDto>(API_ENDPOINTS.revenues.base, payload, {
      context: withInlineHandling(
        withCacheInvalidate([...REVENUES_CACHE_KEYS]),
      ),
    });
  }

  private toParams(query: RevenuesQuery): Record<string, unknown> {
    return {
      PageIndex: query.pageIndex ?? 1,
      PageSize: query.pageSize ?? 10,
      treasuryId: query.treasuryId || undefined,
      from: query.from || undefined,
      to: query.to || undefined,
    };
  }
}
