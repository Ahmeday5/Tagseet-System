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
  withSkipLoader,
} from '../../../core/http/http-context.tokens';
import { toPaged } from '../../../core/utils/api-list.util';
import {
  CreateShareholderPayload,
  Shareholder,
  ShareholdersQuery,
  UpdateShareholderPayload,
} from '../models/shareholder.model';
import {
  CreateProfitSettlementPayload,
  ProfitSettlement,
  ProfitSettlementPreview,
  ProfitSettlementRow,
  ProfitSettlementsQuery,
} from '../models/profit-settlement.model';

/**
 * A shareholder's contribution moves capital-treasury money and recomputes
 * every partner's `ownedPercentage`, so writes invalidate both the
 * shareholders list and the treasury scope — balances refetch everywhere.
 */
const SHAREHOLDERS_CACHE_KEY = 'shareholder';
const TREASURY_CACHE_KEY = 'treasur';

/** Short TTL: ownership percentages shift whenever any partner is added/removed. */
const SHAREHOLDERS_TTL_MS = 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ShareholdersService {
  private readonly api = inject(ApiService);

  list(query: ShareholdersQuery = {}): Observable<PagedResponse<Shareholder>> {
    return this.api
      .get<unknown>(API_ENDPOINTS.shareholders.base, {
        params: this.toParams(query),
        context: withCache({ ttlMs: SHAREHOLDERS_TTL_MS }),
      })
      .pipe(toPaged<Shareholder>());
  }

  /** User-driven refresh — bypasses the in-memory cache. */
  refresh(query: ShareholdersQuery = {}): Observable<PagedResponse<Shareholder>> {
    return this.api
      .get<unknown>(API_ENDPOINTS.shareholders.base, {
        params: this.toParams(query),
        context: withCacheBypass(withCache({ ttlMs: SHAREHOLDERS_TTL_MS })),
      })
      .pipe(toPaged<Shareholder>());
  }

  getById(id: number): Observable<Shareholder> {
    return this.api.get<Shareholder>(API_ENDPOINTS.shareholders.byId(id), {
      context: withCache({ ttlMs: SHAREHOLDERS_TTL_MS }),
    });
  }

  create(payload: CreateShareholderPayload): Observable<Shareholder> {
    return this.api.post<Shareholder>(
      API_ENDPOINTS.shareholders.base,
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([SHAREHOLDERS_CACHE_KEY, TREASURY_CACHE_KEY]),
        ),
      },
    );
  }

  update(
    id: number,
    payload: UpdateShareholderPayload,
  ): Observable<Shareholder> {
    return this.api.put<Shareholder>(
      API_ENDPOINTS.shareholders.byId(id),
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([SHAREHOLDERS_CACHE_KEY, TREASURY_CACHE_KEY]),
        ),
      },
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      API_ENDPOINTS.shareholders.byId(id),
      {
        context: withInlineHandling(
          withCacheInvalidate([SHAREHOLDERS_CACHE_KEY, TREASURY_CACHE_KEY]),
        ),
      },
    );
  }

  private toParams(query: ShareholdersQuery): Record<string, unknown> {
    return {
      PageIndex: query.pageIndex ?? 1,
      PageSize: query.pageSize ?? 10,
      search: query.search?.trim() || undefined,
    };
  }

  // ─────────────── profit settlements ───────────────

  /**
   * Dry-run of the next distribution. Never cached (it must reflect the live
   * profits balance) and runs without the global loader so the modal can show
   * its own spinner.
   */
  previewSettlement(): Observable<ProfitSettlementPreview> {
    return this.api.get<ProfitSettlementPreview>(
      API_ENDPOINTS.shareholders.profitSettlementPreview,
      { context: withSkipLoader() },
    );
  }

  /**
   * Executes the distribution: drains the profits treasury and issues a
   * payment voucher per shareholder. Invalidates shareholders (profit totals)
   * and treasury (balances + vouchers) scopes.
   */
  settleProfits(
    payload: CreateProfitSettlementPayload,
  ): Observable<ProfitSettlement> {
    return this.api.post<ProfitSettlement>(
      API_ENDPOINTS.shareholders.profitSettlement,
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([SHAREHOLDERS_CACHE_KEY, TREASURY_CACHE_KEY]),
        ),
      },
    );
  }

  listSettlements(
    query: ProfitSettlementsQuery = {},
  ): Observable<PagedResponse<ProfitSettlementRow>> {
    return this.api
      .get<unknown>(API_ENDPOINTS.shareholders.profitSettlements, {
        params: this.toSettlementParams(query),
        context: withCache({ ttlMs: SHAREHOLDERS_TTL_MS }),
      })
      .pipe(toPaged<ProfitSettlementRow>());
  }

  refreshSettlements(
    query: ProfitSettlementsQuery = {},
  ): Observable<PagedResponse<ProfitSettlementRow>> {
    return this.api
      .get<unknown>(API_ENDPOINTS.shareholders.profitSettlements, {
        params: this.toSettlementParams(query),
        context: withCacheBypass(withCache({ ttlMs: SHAREHOLDERS_TTL_MS })),
      })
      .pipe(toPaged<ProfitSettlementRow>());
  }

  getSettlement(id: number): Observable<ProfitSettlement> {
    return this.api.get<ProfitSettlement>(
      API_ENDPOINTS.shareholders.profitSettlementById(id),
      { context: withCache({ ttlMs: SHAREHOLDERS_TTL_MS }) },
    );
  }

  private toSettlementParams(
    query: ProfitSettlementsQuery,
  ): Record<string, unknown> {
    return {
      PageIndex: query.pageIndex ?? 1,
      PageSize: query.pageSize ?? 10,
    };
  }
}
