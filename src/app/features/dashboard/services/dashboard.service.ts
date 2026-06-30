import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DueInstallmentDto,
  HomeSummaryDto,
  ProfitMonthDto,
  TopClientDto,
} from '../models/dashboard.model';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCache,
  withCacheBypass,
} from '../../../core/http/http-context.tokens';
import { toList, toPaged } from '../../../core/utils/api-list.util';
import { PagedResponse } from '../../../core/models/api-response.model';

export const DUE_WEEK_PAGE_SIZE = 20;

/** All three dashboard widgets share the same staleness profile — a minute is plenty. */
const HOME_WIDGET_TTL_MS = 60 * 1000;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);
  // ──────────────── live widgets ────────────────

  profitsLast6Months(): Observable<ProfitMonthDto[]> {
    return this.api
      .get<ProfitMonthDto[]>(API_ENDPOINTS.charts.profitsLast6Months, {
        context: withCache({ ttlMs: HOME_WIDGET_TTL_MS }),
      })
      .pipe(toList<ProfitMonthDto>());
  }

  refreshProfitsLast6Months(): Observable<ProfitMonthDto[]> {
    return this.api
      .get<ProfitMonthDto[]>(API_ENDPOINTS.charts.profitsLast6Months, {
        context: withCacheBypass(withCache({ ttlMs: HOME_WIDGET_TTL_MS })),
      })
      .pipe(toList<ProfitMonthDto>());
  }

  topClientsThisMonth(): Observable<TopClientDto[]> {
    return this.api
      .get<TopClientDto[]>(API_ENDPOINTS.clients.topThisMonth, {
        context: withCache({ ttlMs: HOME_WIDGET_TTL_MS }),
      })
      .pipe(toList<TopClientDto>());
  }

  refreshTopClientsThisMonth(): Observable<TopClientDto[]> {
    return this.api
      .get<TopClientDto[]>(API_ENDPOINTS.clients.topThisMonth, {
        context: withCacheBypass(withCache({ ttlMs: HOME_WIDGET_TTL_MS })),
      })
      .pipe(toList<TopClientDto>());
  }

  installmentsDueThisWeek(
    pageIndex: number = 1,
    pageSize: number = DUE_WEEK_PAGE_SIZE,
  ): Observable<PagedResponse<DueInstallmentDto>> {
    return this.api
      .get<PagedResponse<DueInstallmentDto>>(
        API_ENDPOINTS.installments.dueThisWeek,
        {
          params: { pageIndex, pageSize },
          context: withCache({ ttlMs: HOME_WIDGET_TTL_MS }),
        },
      )
      .pipe(toPaged<DueInstallmentDto>());
  }

  refreshInstallmentsDueThisWeek(
    pageIndex: number = 1,
    pageSize: number = DUE_WEEK_PAGE_SIZE,
  ): Observable<PagedResponse<DueInstallmentDto>> {
    return this.api
      .get<PagedResponse<DueInstallmentDto>>(
        API_ENDPOINTS.installments.dueThisWeek,
        {
          params: { pageIndex, pageSize },
          context: withCacheBypass(withCache({ ttlMs: HOME_WIDGET_TTL_MS })),
        },
      )
      .pipe(toPaged<DueInstallmentDto>());
  }

  homeSummary(): Observable<HomeSummaryDto> {
    return this.api.get<HomeSummaryDto>(API_ENDPOINTS.dashboard.homeSummary, {
      context: withCache({ ttlMs: HOME_WIDGET_TTL_MS }),
    });
  }

  refreshHomeSummary(): Observable<HomeSummaryDto> {
    return this.api.get<HomeSummaryDto>(API_ENDPOINTS.dashboard.homeSummary, {
      context: withCacheBypass(withCache({ ttlMs: HOME_WIDGET_TTL_MS })),
    });
  }
}
