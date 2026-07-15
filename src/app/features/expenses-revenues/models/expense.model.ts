import { PagedResponse } from '../../../core/models/api-response.model';

/** Row shape returned by `GET /dashboard/expenses`. */
export interface ExpenseDto {
  id: number;
  expenseNumber: string;
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

/** POST /dashboard/expenses body. `date` is optional — omit to default to today. */
export interface CreateExpensePayload {
  amount: number;
  date?: string;
  treasuryId: number;
  notes?: string;
  representativeId?: number | null;
}

/** PUT /dashboard/expenses/{id} body. */
export interface UpdateExpensePayload {
  amount: number;
  date: string;
  treasuryId: number;
  notes?: string;
  representativeId?: number | null;
}

/** Query parameters supported by `GET /dashboard/expenses`. */
export interface ExpensesQuery {
  pageIndex?: number;
  pageSize?: number;
  treasuryId?: number | '';
  representativeId?: number | '';
  /** `yyyy-MM-dd` — inclusive lower bound. */
  from?: string;
  /** `yyyy-MM-dd` — inclusive upper bound. */
  to?: string;
}

/**
 * Wire shape of `GET /dashboard/expenses` — the running total is unaffected
 * by the active filters, so it's returned alongside (not derived from) the
 * paged `items`.
 */
export interface ExpensesResponse {
  summary: { totalExpenses: number };
  items: PagedResponse<ExpenseDto>;
}
