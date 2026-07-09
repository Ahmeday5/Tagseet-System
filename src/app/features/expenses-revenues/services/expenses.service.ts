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
  CreateExpensePayload,
  ExpenseDto,
  ExpensesQuery,
  ExpensesResponse,
} from '../models/expense.model';

/**
 * Recording an expense draws down a treasury (and the profits treasury via
 * the backend's automatic distribution), so writes invalidate both scopes.
 */
const EXPENSES_CACHE_KEYS = ['expenses', 'treasur'] as const;

const EXPENSES_TTL_MS = 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly api = inject(ApiService);

  list(query: ExpensesQuery = {}): Observable<ExpensesResponse> {
    return this.api.get<ExpensesResponse>(API_ENDPOINTS.expenses.base, {
      params: this.toParams(query),
      context: withCache({ ttlMs: EXPENSES_TTL_MS }),
    });
  }

  /** User-driven refresh — bypasses the in-memory cache. */
  refresh(query: ExpensesQuery = {}): Observable<ExpensesResponse> {
    return this.api.get<ExpensesResponse>(API_ENDPOINTS.expenses.base, {
      params: this.toParams(query),
      context: withCacheBypass(withCache({ ttlMs: EXPENSES_TTL_MS })),
    });
  }

  create(payload: CreateExpensePayload): Observable<ExpenseDto> {
    return this.api.post<ExpenseDto>(API_ENDPOINTS.expenses.base, payload, {
      context: withInlineHandling(
        withCacheInvalidate([...EXPENSES_CACHE_KEYS]),
      ),
    });
  }

  private toParams(query: ExpensesQuery): Record<string, unknown> {
    return {
      PageIndex: query.pageIndex ?? 1,
      PageSize: query.pageSize ?? 10,
      treasuryId: query.treasuryId || undefined,
      from: query.from || undefined,
      to: query.to || undefined,
    };
  }
}
