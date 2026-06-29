import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { asPaged, fetchAllPages } from '../../../core/utils/api-list.util';
import {
  ClientProfileResponse,
  CreateClientPayload,
  CreatedClient,
  DashboardClient,
  DashboardClientsQuery,
  DashboardClientsResponse,
  UpdateClientPayload,
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
   * contract/payment client select and the voucher "related party" select.
   *
   * Walks every page (see `fetchAllPages`) instead of betting on a single
   * oversized page, so the picker never silently drops clients once the
   * roster grows past a hard-coded size.
   */
  listAllClients(): Observable<DashboardClient[]> {
    return fetchAllPages<DashboardClient>((pageIndex, pageSize) =>
      this.listDashboard({ pageIndex, pageSize }).pipe(
        map((res) => asPaged<DashboardClient>(res?.clients)),
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

  /**
   * Full client profile — `GET /dashboard/clients/{id}`.
   * Returns the extended client object plus contract summary counters.
   */
  getClientProfile(id: number): Observable<ClientProfileResponse> {
    return this.api.get<ClientProfileResponse>(API_ENDPOINTS.clients.byId(id), {
      context: withCacheBypass(withCache({ ttlMs: CLIENTS_TTL_MS })),
    });
  }

  /**
   * Fetches a single client's record used to pre-fill the edit form.
   * Maps from the full profile response to the `CreatedClient` shape.
   */
  getClient(id: number): Observable<CreatedClient> {
    return this.getClientProfile(id).pipe(
      map((res) => res.client as unknown as CreatedClient),
    );
  }

  /**
   * Updates a client (PUT /dashboard/clients/{id}). Invalidates the clients
   * cache scope so the list — and the overdue badge — re-fetch.
   */
  updateClient(
    id: number,
    payload: UpdateClientPayload,
  ): Observable<CreatedClient> {
    return this.api.put<CreatedClient>(
      API_ENDPOINTS.clients.byId(id),
      this.normalizeUpdate(payload),
      {
        context: withInlineHandling(withCacheInvalidate([CLIENTS_CACHE_KEY])),
      },
    );
  }

  private normalizeUpdate(payload: UpdateClientPayload): UpdateClientPayload {
    return {
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      nationalId: payload.nationalId.trim(),
      address: payload.address.trim(),
      phoneNumber: payload.phoneNumber.trim(),
      whatsappNumber: payload.whatsappNumber.trim(),
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
