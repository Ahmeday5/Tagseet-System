import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';
import { ContractDetails } from '../../customers/models/client-statement.model';
import {
  Contract,
  ContractFormState,
  CreatedContract,
  buildCreateContractPayload,
  CreateDirectContractPayload,
  CreatedDirectContract,
  buildDirectContractPayload,
  UpdateContractFormState,
  buildUpdateContractPayload,
} from '../models/contract.model';

const CONTRACTS_CACHE_KEY = 'contracts';
const CONTRACT_DETAILS_TTL_MS = 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ContractsService {
  private readonly api = inject(ApiService);

  // ─────────── live API ───────────

  /**
   * Regular installment-contract creation.
   * POST /dashboard/contracts
   */
  create(form: ContractFormState): Observable<CreatedContract> {
    return this.api.post<CreatedContract>(
      API_ENDPOINTS.contracts.base,
      buildCreateContractPayload(form),
      {
        context: withInlineHandling(
          withCacheInvalidate([
            CONTRACTS_CACHE_KEY,
            'client',
            'warehous',
            'treasur',
            'invoice',
            'financial-separation',
          ]),
        ),
      },
    );
  }

  /**
   * Direct installment-contract creation (no product/warehouse link).
   *
   * POST /dashboard/contracts/direct
   */
  createDirect(
    payload: CreateDirectContractPayload,
  ): Observable<CreatedDirectContract> {
    return this.api.post<CreatedDirectContract>(
      API_ENDPOINTS.contracts.direct,
      buildDirectContractPayload(payload),
      {
        context: withInlineHandling(
          withCacheInvalidate([
            CONTRACTS_CACHE_KEY,
            'client',
            'treasur',
            'financial-separation',
          ]),
        ),
      },
    );
  }

  /**
   * Update an existing installment contract.
   *
   * PUT /dashboard/contracts/{id}
   */
  update(
    id: number,
    form: UpdateContractFormState,
  ): Observable<CreatedContract> {
    return this.api.put<CreatedContract>(
      API_ENDPOINTS.contracts.byId(id),
      buildUpdateContractPayload(form),
      {
        context: withInlineHandling(
          withCacheInvalidate([
            CONTRACTS_CACHE_KEY,
            'client',
            'warehous',
            'treasur',
            'financial-separation',
          ]),
        ),
      },
    );
  }

  /**
   * Update an existing direct installment contract (no product/warehouse link).
   *
   * PUT /dashboard/contracts/{id}/direct
   */
  updateDirect(
    id: number,
    payload: CreateDirectContractPayload,
  ): Observable<void> {
    return this.api.put<void>(
      API_ENDPOINTS.contracts.updateDirect(id),
      buildDirectContractPayload(payload),
      {
        context: withInlineHandling(
          withCacheInvalidate([
            CONTRACTS_CACHE_KEY,
            'client',
            'treasur',
            'financial-separation',
          ]),
        ),
      },
    );
  }

  cancel(id: number): Observable<void> {
    return this.api.post<void>(API_ENDPOINTS.contracts.cancel(id), {}, {
      context: withInlineHandling(
        withCacheInvalidate([
          CONTRACTS_CACHE_KEY,
          'client',
          'treasur',
          'financial-separation',
        ]),
      ),
    });
  }

  returnContract(id: number): Observable<void> {
    return this.api.post<void>(API_ENDPOINTS.contracts.returnContract(id), {}, {
      context: withInlineHandling(
        withCacheInvalidate([
          CONTRACTS_CACHE_KEY,
          'client',
          'treasur',
          'financial-separation',
        ]),
      ),
    });
  }

  /**
   * Full contract details — client, product, warehouse, summary, and the
   * full installments schedule.
   *
   *   GET /dashboard/contracts/{id}/details
   *
   * Cached briefly; invalidated by any `payment` / `installment` / `contract`
   * mutation so the modal reflects the latest paid amounts.
   */
  getDetails(id: number): Observable<ContractDetails> {
    return this.api.get<ContractDetails>(API_ENDPOINTS.contracts.details(id), {
      context: withCache({ ttlMs: CONTRACT_DETAILS_TTL_MS }),
    });
  }

  refreshDetails(id: number): Observable<ContractDetails> {
    return this.api.get<ContractDetails>(API_ENDPOINTS.contracts.details(id), {
      context: withCacheBypass(withCache({ ttlMs: CONTRACT_DETAILS_TTL_MS })),
    });
  }
}
