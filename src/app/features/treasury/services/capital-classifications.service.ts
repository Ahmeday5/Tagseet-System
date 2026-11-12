import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import { PagedResponse } from '../../../core/models/api-response.model';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';
import { fetchAllPages, toPaged } from '../../../core/utils/api-list.util';
import {
  CapitalClassification,
  CapitalClassificationsQuery,
  CapitalClassificationStatement,
  CapitalClassificationStatementQuery,
  SaveCapitalClassificationPayload,
} from '../models/capital-classification.model';

/**
 * Lives under the `shareholder` cache scope (the URL contains it), so a capital
 * movement write — which changes `transactionsCount` and the statements —
 * refreshes classification reads too.
 */
const CLASSIFICATIONS_CACHE_KEY = 'capital-classification';
const SHAREHOLDERS_CACHE_KEY = 'shareholder';
const TTL_MS = 60 * 1000;

@Injectable({ providedIn: 'root' })
export class CapitalClassificationsService {
  private readonly api = inject(ApiService);

  list(
    query: CapitalClassificationsQuery = {},
    force = false,
  ): Observable<PagedResponse<CapitalClassification>> {
    const cache = withCache({ ttlMs: TTL_MS });
    return this.api
      .get<unknown>(API_ENDPOINTS.shareholders.capitalClassifications, {
        params: {
          PageIndex: query.pageIndex ?? 1,
          PageSize: query.pageSize ?? 20,
          search: query.search?.trim() || undefined,
        },
        context: force ? withCacheBypass(cache) : cache,
      })
      .pipe(toPaged<CapitalClassification>());
  }

  /** Every classification — for the optional pickers on capital movements. */
  listAll(): Observable<CapitalClassification[]> {
    return fetchAllPages<CapitalClassification>((pageIndex, pageSize) =>
      this.list({ pageIndex, pageSize }),
    );
  }

  getById(id: number): Observable<CapitalClassification> {
    return this.api.get<CapitalClassification>(
      API_ENDPOINTS.shareholders.capitalClassificationById(id),
    );
  }

  create(payload: SaveCapitalClassificationPayload): Observable<CapitalClassification> {
    return this.api.post<CapitalClassification>(
      API_ENDPOINTS.shareholders.capitalClassifications,
      payload,
      { context: withInlineHandling(withCacheInvalidate([CLASSIFICATIONS_CACHE_KEY])) },
    );
  }

  update(
    id: number,
    payload: SaveCapitalClassificationPayload,
  ): Observable<CapitalClassification> {
    return this.api.put<CapitalClassification>(
      API_ENDPOINTS.shareholders.capitalClassificationById(id),
      payload,
      {
        // Name shows on every tagged movement — refresh shareholder ledgers too.
        context: withInlineHandling(
          withCacheInvalidate([CLASSIFICATIONS_CACHE_KEY, SHAREHOLDERS_CACHE_KEY]),
        ),
      },
    );
  }

  /** Rejected with 400 while any movement still uses the classification. */
  delete(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      API_ENDPOINTS.shareholders.capitalClassificationById(id),
      { context: withInlineHandling(withCacheInvalidate([CLASSIFICATIONS_CACHE_KEY])) },
    );
  }

  statement(
    id: number,
    query: CapitalClassificationStatementQuery = {},
    force = false,
  ): Observable<CapitalClassificationStatement> {
    const cache = withCache({ ttlMs: TTL_MS });
    return this.api.get<CapitalClassificationStatement>(
      API_ENDPOINTS.shareholders.capitalClassificationStatement(id),
      {
        params: {
          PageIndex: query.pageIndex ?? 1,
          PageSize: query.pageSize ?? 10,
          fromDate: query.fromDate || undefined,
          toDate: query.toDate || undefined,
        },
        context: force ? withCacheBypass(cache) : cache,
      },
    );
  }
}
