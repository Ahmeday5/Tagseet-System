import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCache,
  withCacheBypass,
} from '../../../core/http/http-context.tokens';
import { FinancialSeparation } from '../models/financial.model';

const FINANCIAL_TTL_MS = 60 * 1000; // 1 min — figures change with every payment/invoice

/**
 * Financial-position snapshot.
 *
 * Thin wrapper around `/dashboard/financial-separation`. Kept separate
 * from `DashboardService` because the financial breakdown changes on
 * a different cadence than the legacy dashboard payload (every payment
 * vs. once-per-session) and deserves its own short cache TTL.
 */
@Injectable({ providedIn: 'root' })
export class FinancialService {
  private readonly api = inject(ApiService);

  separation(): Observable<FinancialSeparation> {
    return this.api.get<FinancialSeparation>(
      API_ENDPOINTS.financial.separation,
      { context: withCache({ ttlMs: FINANCIAL_TTL_MS }) },
    );
  }

  refreshSeparation(): Observable<FinancialSeparation> {
    return this.api.get<FinancialSeparation>(
      API_ENDPOINTS.financial.separation,
      { context: withCacheBypass(withCache({ ttlMs: FINANCIAL_TTL_MS })) },
    );
  }
}
