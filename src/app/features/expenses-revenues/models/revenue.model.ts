import { PagedResponse } from '../../../core/models/api-response.model';

/** Row shape returned by `GET /dashboard/revenues`. */
export interface RevenueDto {
  id: number;
  revenueNumber: string;
  amount: number;
  /** ISO timestamp (sometimes date-only). */
  date: string;
  treasuryId: number;
  treasuryName: string;
  representativeId: number | null;
  representativeName: string | null;
  notes: string | null;
  createdAt: string;
}

/** POST /dashboard/revenues body. `date` is optional — omit to default to today. */
export interface CreateRevenuePayload {
  amount: number;
  date?: string;
  treasuryId: number;
  notes?: string;
  representativeId?: number | null;
}

/** PUT /dashboard/revenues/{id} body. */
export interface UpdateRevenuePayload {
  amount: number;
  date: string;
  treasuryId: number;
  notes?: string;
  representativeId?: number | null;
}

/** Query parameters supported by `GET /dashboard/revenues`. */
export interface RevenuesQuery {
  pageIndex?: number;
  pageSize?: number;
  treasuryId?: number | '';
  /** `yyyy-MM-dd` — inclusive lower bound. */
  from?: string;
  /** `yyyy-MM-dd` — inclusive upper bound. */
  to?: string;
}

/**
 * Wire shape of `GET /dashboard/revenues` — the running total is unaffected
 * by the active filters, so it's returned alongside (not derived from) the
 * paged `items`.
 */
export interface RevenuesResponse {
  summary: { totalRevenues: number };
  items: PagedResponse<RevenueDto>;
}
