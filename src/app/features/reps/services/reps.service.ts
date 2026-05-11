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
import {
  CreateRepresentativePayload,
  Representative,
  RepresentativesListResponse,
  RepresentativesQuery,
  UpdateRepresentativePayload,
} from '../models/rep.model';

const REPS_CACHE_KEY = 'representatives';
const REPS_TTL_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class RepsService {
  private readonly api = inject(ApiService);

  // ─────────── reads ───────────

  list(
    query: RepresentativesQuery = {},
  ): Observable<RepresentativesListResponse> {
    return this.api.get<RepresentativesListResponse>(
      API_ENDPOINTS.representatives.base,
      {
        params: this.toParams(query),
        context: withCache({ ttlMs: REPS_TTL_MS }),
      },
    );
  }

  refreshList(
    query: RepresentativesQuery = {},
  ): Observable<RepresentativesListResponse> {
    return this.api.get<RepresentativesListResponse>(
      API_ENDPOINTS.representatives.base,
      {
        params: this.toParams(query),
        context: withCacheBypass(withCache({ ttlMs: REPS_TTL_MS })),
      },
    );
  }

  getById(id: number): Observable<Representative> {
    return this.api.get<Representative>(
      API_ENDPOINTS.representatives.byId(id),
      { context: withCache({ ttlMs: REPS_TTL_MS }) },
    );
  }

  // ─────────── writes ───────────

  create(payload: CreateRepresentativePayload): Observable<Representative> {
    return this.api.post<Representative>(
      API_ENDPOINTS.representatives.base,
      this.normalize(payload),
      {
        context: withInlineHandling(
          withCacheInvalidate([REPS_CACHE_KEY, 'treasur']),
        ),
      },
    );
  }

  update(
    id: number,
    payload: UpdateRepresentativePayload,
  ): Observable<Representative> {
    return this.api.put<Representative>(
      API_ENDPOINTS.representatives.byId(id),
      this.normalize(payload),
      {
        context: withInlineHandling(
          withCacheInvalidate([REPS_CACHE_KEY, 'treasur']),
        ),
      },
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      API_ENDPOINTS.representatives.byId(id),
      {
        context: withInlineHandling(
          withCacheInvalidate([REPS_CACHE_KEY, 'treasur']),
        ),
      },
    );
  }

  // ─────────── helpers ───────────

  private toParams(query: RepresentativesQuery): Record<string, unknown> {
    return {
      PageIndex: query.pageIndex ?? 1,
      PageSize: query.pageSize ?? 10,
      search: query.search?.trim() || undefined,
    };
  }

  /**
   * Trim string fields and clamp numerics into the ranges the backend
   * accepts. `performanceRating` outside 0..5 returns a 400 from the API,
   * so we cap it here to surface the issue as a form-validation error
   * before the request leaves the client.
   */
  private normalize(
    payload: CreateRepresentativePayload,
  ): CreateRepresentativePayload {
    return {
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      password: payload.password,
      phoneNumber: payload.phoneNumber.trim(),
      permissions: payload.permissions,
      profitRatePercent: this.clamp(payload.profitRatePercent, 0, 100),
      performanceRating: this.clamp(payload.performanceRating, 0, 5),
      status: payload.status,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
  }
}
