import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import { withInlineHandling } from '../../../core/http/http-context.tokens';
import { BalanceCheck } from '../models/balance-check.model';
import { normalizeBalanceCheck } from '../utils/balance-check.normalizer';

@Injectable({ providedIn: 'root' })
export class BalanceCheckService {
  private readonly api = inject(ApiService);

  /**
   * Always hits the server — a reconciliation report is only useful when
   * it's current, so it is deliberately never cached. Errors are handled
   * inline by the page (403 gets its own state instead of a toast).
   */
  get(): Observable<BalanceCheck> {
    return this.api
      .get<unknown>(API_ENDPOINTS.dashboard.balanceCheck, {
        context: withInlineHandling(),
      })
      .pipe(map(normalizeBalanceCheck));
  }
}
