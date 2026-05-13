import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import { PagedQuery } from '../../../core/models/api-response.model';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';
import {
  CreateSupplierPayload,
  Supplier,
  SuppliersListResponse,
  SupplierStatement,
  SupplierStatementQuery,
  UpdateSupplierPayload,
} from '../models/supplier.model';

const SUPPLIERS_CACHE_KEY = 'suppliers';
const SUPPLIERS_TTL_MS = 5 * 60 * 1000; // 5 min — list churns whenever a supplier is added/edited
const STATEMENT_TTL_MS = 60 * 1000; // 1 min — figures move with every payment/draft

const FLAT_LIST_PAGE_SIZE = 500;

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly api = inject(ApiService);

  // ─────────── reads ───────────

  list(query: PagedQuery = {}): Observable<SuppliersListResponse> {
    return this.api.get<SuppliersListResponse>(API_ENDPOINTS.suppliers.base, {
      params: this.toParams(query),
      context: withCache({ ttlMs: SUPPLIERS_TTL_MS }),
    });
  }

  refreshList(query: PagedQuery = {}): Observable<SuppliersListResponse> {
    return this.api.get<SuppliersListResponse>(API_ENDPOINTS.suppliers.base, {
      params: this.toParams(query),
      context: withCacheBypass(withCache({ ttlMs: SUPPLIERS_TTL_MS })),
    });
  }

  listAll(): Observable<Supplier[]> {
    return this.list({ pageIndex: 1, pageSize: FLAT_LIST_PAGE_SIZE }).pipe(
      map((res) => Array.isArray(res?.items?.data) ? res.items.data : []),
    );
  }

  getById(id: number): Observable<Supplier> {
    return this.api.get<Supplier>(API_ENDPOINTS.suppliers.byId(id), {
      context: withCache({ ttlMs: SUPPLIERS_TTL_MS }),
    });
  }

  // ─────────── account statement ───────────

  statement(
    id: number,
    query: SupplierStatementQuery = {},
  ): Observable<SupplierStatement> {
    return this.api.get<SupplierStatement>(
      API_ENDPOINTS.suppliers.statement(id),
      {
        params: this.toStatementParams(query),
        context: withCache({ ttlMs: STATEMENT_TTL_MS }),
      },
    );
  }

  /** User-driven refresh — bypasses the in-memory cache. */
  refreshStatement(
    id: number,
    query: SupplierStatementQuery = {},
  ): Observable<SupplierStatement> {
    return this.api.get<SupplierStatement>(
      API_ENDPOINTS.suppliers.statement(id),
      {
        params: this.toStatementParams(query),
        context: withCacheBypass(withCache({ ttlMs: STATEMENT_TTL_MS })),
      },
    );
  }

  private toStatementParams(
    query: SupplierStatementQuery,
  ): Record<string, unknown> {
    return {
      from: query.from || undefined,
      to: query.to || undefined,
      includeDrafts: query.includeDrafts ?? false,
    };
  }

  // ─────────── writes ───────────

  create(payload: CreateSupplierPayload): Observable<Supplier> {
    return this.api.post<Supplier>(
      API_ENDPOINTS.suppliers.base,
      this.normalize(payload),
      {
        context: withInlineHandling(
          withCacheInvalidate([SUPPLIERS_CACHE_KEY]),
        ),
      },
    );
  }

  update(id: number, payload: UpdateSupplierPayload): Observable<Supplier> {
    return this.api.put<Supplier>(
      API_ENDPOINTS.suppliers.byId(id),
      this.normalize(payload),
      {
        context: withInlineHandling(
          withCacheInvalidate([SUPPLIERS_CACHE_KEY]),
        ),
      },
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      API_ENDPOINTS.suppliers.byId(id),
      {
        context: withInlineHandling(
          withCacheInvalidate([SUPPLIERS_CACHE_KEY]),
        ),
      },
    );
  }

  // ─────────── helpers ───────────

  private toParams(query: PagedQuery): Record<string, unknown> {
    return {
      PageIndex: query.pageIndex ?? 1,
      PageSize: query.pageSize ?? 10,
      search: query.search ?? '',
    };
  }

  private normalize(payload: CreateSupplierPayload): CreateSupplierPayload {
    return {
      fullName: payload.fullName.trim(),
      address: payload.address.trim(),
      phoneNumber: payload.phoneNumber.trim(),
    };
  }
}
