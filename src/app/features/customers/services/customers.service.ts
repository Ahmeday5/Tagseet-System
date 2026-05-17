import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  CreateClientPayload,
  CreatedClient,
  DashboardClient,
  DashboardClientsQuery,
  DashboardClientsResponse,
} from '../models/dashboard-client.model';
import {
  ClientContractsPage,
  ClientContractsQuery,
} from '../models/client-statement.model';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';

const CLIENTS_TTL_MS = 2 * 60 * 1000; // 2 min — list churns whenever a payment is recorded
/**
 * Invalidating `'clients'` (not `'client'`) clears the clients-list cache
 * without also nuking unrelated `client-orders` entries, while still
 * matching the looser `onInvalidate('client')` listeners (substring).
 */
const CLIENTS_CACHE_KEY = 'clients';
/** One oversized page used to feed entity pickers (e.g. voucher party). */
const FLAT_LIST_PAGE_SIZE = 500;

// Local pagination shape used by the mock — keep until this feature is wired
// to the real backend, then migrate to `PaginatedResponse<T>` from api-response.model.
export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly api = inject(ApiService);

  listDashboard(
    query: DashboardClientsQuery = {},
  ): Observable<DashboardClientsResponse> {
    return this.api.get<DashboardClientsResponse>(API_ENDPOINTS.clients.base, {
      params: this.toClientsParams(query),
      context: withCache({ ttlMs: CLIENTS_TTL_MS }),
    });
  }

  /** User-driven refresh — bypasses the in-memory cache. */
  refreshDashboard(
    query: DashboardClientsQuery = {},
  ): Observable<DashboardClientsResponse> {
    return this.api.get<DashboardClientsResponse>(API_ENDPOINTS.clients.base, {
      params: this.toClientsParams(query),
      context: withCacheBypass(withCache({ ttlMs: CLIENTS_TTL_MS })),
    });
  }

  /**
   * Flat client list (id + name + phone) for entity pickers — e.g. the
   * voucher "related party" select. One oversized page; mirrors the
   * `SuppliersService.listAll()` pattern.
   */
  listAllClients(): Observable<DashboardClient[]> {
    return this.listDashboard({
      pageIndex: 1,
      pageSize: FLAT_LIST_PAGE_SIZE,
    }).pipe(
      map((res) =>
        Array.isArray(res?.clients?.data) ? res.clients.data : [],
      ),
    );
  }

  /**
   * Creates a client (and the linked AppUser, server-side). Invalidates the
   * clients cache scope so the list — and the overdue badge — re-fetch.
   */
  createClient(payload: CreateClientPayload): Observable<CreatedClient> {
    return this.api.post<CreatedClient>(
      API_ENDPOINTS.clients.base,
      this.normalizeCreate(payload),
      {
        context: withInlineHandling(
          withCacheInvalidate([CLIENTS_CACHE_KEY]),
        ),
      },
    );
  }

  private normalizeCreate(payload: CreateClientPayload): CreateClientPayload {
    return {
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      nationalId: payload.nationalId.trim(),
      address: payload.address.trim(),
      phoneNumber: payload.phoneNumber.trim(),
      whatsappNumber: payload.whatsappNumber.trim(),
      password: payload.password,
    };
  }

  private toClientsParams(
    query: DashboardClientsQuery,
  ): Record<string, unknown> {
    return {
      PageIndex: query.pageIndex ?? 1,
      PageSize: query.pageSize ?? 10,
      search: query.search?.trim() || undefined,
      onlyOverdue: query.onlyOverdue ? true : undefined,
    };
  }

  // ── Client contracts (real API) ─────────────────────────────────────────

  getClientContracts(
    clientId: number,
    query: ClientContractsQuery = {},
  ): Observable<ClientContractsPage> {
    return this.api.get<ClientContractsPage>(
      API_ENDPOINTS.clients.contracts(clientId),
      {
        params: {
          PageIndex: query.pageIndex ?? 1,
          PageSize: query.pageSize ?? 10,
        },
        context: withCache({ ttlMs: CLIENTS_TTL_MS }),
      },
    );
  }

  refreshClientContracts(
    clientId: number,
    query: ClientContractsQuery = {},
  ): Observable<ClientContractsPage> {
    return this.api.get<ClientContractsPage>(
      API_ENDPOINTS.clients.contracts(clientId),
      {
        params: {
          PageIndex: query.pageIndex ?? 1,
          PageSize: query.pageSize ?? 10,
        },
        context: withCacheBypass(withCache({ ttlMs: CLIENTS_TTL_MS })),
      },
    );
  }

  recordPayment(_data: {
    contractId: string;
    amount: number;
    method: string;
    date: string;
  }): Observable<void> {
    return of(undefined).pipe(delay(400));
  }
}
