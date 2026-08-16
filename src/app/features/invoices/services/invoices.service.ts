import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';
import { toPaged } from '../../../core/utils/api-list.util';
import { PagedResponse } from '../../../core/models/api-response.model';
import {
  ConfirmPurchaseInvoicePayload,
  CreateDirectPurchaseInvoicePayload,
  CreatePurchaseInvoicePayload,
  PayInvoicePayload,
  PurchaseInvoice,
  PurchaseInvoiceFilters,
  PurchaseInvoiceListItem,
  PurchaseInvoiceSummary,
  UpdateDirectPurchaseInvoicePayload,
  UpdatePurchaseInvoicePayload,
} from '../models/invoice.model';

const INVOICES_CACHE_KEY = 'supplier-purchase-invoices';
const INVOICES_TTL_MS = 60 * 1000; // 1 min — list/summary churn with each save

// Invoice confirmation and payments pull money out of a treasury — any
// write that touches a treasury balance must also bust the treasury cache
// so the treasury page reflects the change immediately.
const TREASURY_CACHE_KEY = 'treasur';

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private readonly api = inject(ApiService);

  // ─────────── reads ───────────

  list(
    filters: PurchaseInvoiceFilters = {},
  ): Observable<PagedResponse<PurchaseInvoiceListItem>> {
    return this.api
      .get<unknown>(API_ENDPOINTS.purchaseInvoices.base, {
        params: this.toParams(filters),
        context: withCache({ ttlMs: INVOICES_TTL_MS }),
      })
      .pipe(toPaged<PurchaseInvoiceListItem>());
  }

  refreshList(
    filters: PurchaseInvoiceFilters = {},
  ): Observable<PagedResponse<PurchaseInvoiceListItem>> {
    return this.api
      .get<unknown>(API_ENDPOINTS.purchaseInvoices.base, {
        params: this.toParams(filters),
        context: withCacheBypass(withCache({ ttlMs: INVOICES_TTL_MS })),
      })
      .pipe(toPaged<PurchaseInvoiceListItem>());
  }

  getSummary(): Observable<PurchaseInvoiceSummary> {
    return this.api.get<PurchaseInvoiceSummary>(
      API_ENDPOINTS.purchaseInvoices.summary,
      { context: withCache({ ttlMs: INVOICES_TTL_MS }) },
    );
  }

  getById(id: number): Observable<PurchaseInvoice> {
    return this.api.get<PurchaseInvoice>(
      API_ENDPOINTS.purchaseInvoices.byId(id),
      { context: withCache({ ttlMs: INVOICES_TTL_MS }) },
    );
  }

  // ─────────── writes ───────────

  create(payload: CreatePurchaseInvoicePayload): Observable<PurchaseInvoice> {
    return this.api.post<PurchaseInvoice>(
      API_ENDPOINTS.purchaseInvoices.base,
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([INVOICES_CACHE_KEY]),
        ),
      },
    );
  }

  update(
    id: number,
    payload: UpdatePurchaseInvoicePayload,
  ): Observable<PurchaseInvoice> {
    return this.api.put<PurchaseInvoice>(
      API_ENDPOINTS.purchaseInvoices.byId(id),
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([INVOICES_CACHE_KEY]),
        ),
      },
    );
  }

  /**
   * Creates a "direct" invoice — no warehouse, free-text `productName` line
   * items, always final (no draft/confirm step). Never touches inventory.
   */
  createDirect(
    payload: CreateDirectPurchaseInvoicePayload,
  ): Observable<PurchaseInvoice> {
    return this.api.post<PurchaseInvoice>(
      API_ENDPOINTS.purchaseInvoices.direct,
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([INVOICES_CACHE_KEY]),
        ),
      },
    );
  }

  /**
   * Edits a direct invoice. Only valid when the target invoice's own
   * `isDirect` flag is true — the server 400s otherwise; callers must check
   * that flag before choosing this over `update()`.
   */
  updateDirect(
    id: number,
    payload: UpdateDirectPurchaseInvoicePayload,
  ): Observable<PurchaseInvoice> {
    return this.api.put<PurchaseInvoice>(
      API_ENDPOINTS.purchaseInvoices.directById(id),
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([INVOICES_CACHE_KEY]),
        ),
      },
    );
  }

  confirm(
    id: number,
    payload: ConfirmPurchaseInvoicePayload,
  ): Observable<PurchaseInvoice> {
    return this.api.post<PurchaseInvoice>(
      API_ENDPOINTS.purchaseInvoices.confirm(id),
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([INVOICES_CACHE_KEY, TREASURY_CACHE_KEY]),
        ),
      },
    );
  }

  /**
   * Records a partial or full payment against a non-Draft invoice.
   * Returns the updated invoice (with new paidAmount / remainingAmount / status).
   * Invalidates both invoice and treasury caches — payment reduces the
   * treasury balance, so the treasury page must re-fetch immediately.
   */
  pay(id: number, payload: PayInvoicePayload): Observable<PurchaseInvoice> {
    return this.api.post<PurchaseInvoice>(
      API_ENDPOINTS.purchaseInvoices.payments(id),
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([INVOICES_CACHE_KEY, TREASURY_CACHE_KEY]),
        ),
      },
    );
  }

  /**
   * Permanently deletes the invoice. The backend reverses any inventory
   * quantities it posted and refunds paid amounts back to the treasuries
   * used, so both caches must invalidate — same as `confirm`/`pay`.
   */
  delete(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      API_ENDPOINTS.purchaseInvoices.byId(id),
      {
        context: withInlineHandling(
          withCacheInvalidate([INVOICES_CACHE_KEY, TREASURY_CACHE_KEY]),
        ),
      },
    );
  }

  // ─────────── internals ───────────

  private toParams(filters: PurchaseInvoiceFilters): Record<string, unknown> {
    return {
      PageIndex: filters.pageIndex ?? 1,
      PageSize: filters.pageSize ?? 10,
      search: filters.search ?? '',
      status: filters.status ?? '',
      supplierId: filters.supplierId ?? '',
    };
  }
}
