/** Row / detail shape returned by `GET /dashboard/shareholders[/{id}]`. */
export interface Shareholder {
  id: number;
  name: string;
  phoneNumber: string;
  address: string;
  /** Capital injected by this shareholder — set once on create, server-managed after. */
  contributedAmount: number;
  /** Server-derived share of total capital (%). */
  ownedPercentage: number;
  companyPercentage: number;
  /** Cumulative profit distributed to this shareholder so far. */
  totalProfitReceived: number;
  /** Profit accrued from installment payments, not yet settled or capitalised. */
  accruedProfit: number;
  capitalTreasuryId: number;
  capitalTreasuryName: string;
  notes: string | null;
  createdAt: string;
  /** True only for the synthetic "الشركة" row (id 0) the list prepends to page 1 — read-only. */
  isCompany?: boolean;
}

/** `GET shareholders/summary`. */
export interface ShareholdersSummary {
  shareholdersCount: number;
  totalShareholdersCapital: number;
  companyBalance: number;
  totalIncludingCompany: number;
}

/** `POST shareholders/company-balance/transactions` — Receipt = إيداع, Payment = سحب. */
export interface CompanyBalanceTransactionPayload {
  type: 'Receipt' | 'Payment';
  amount: number;
  /** `yyyy-MM-dd`. */
  date: string;
  notes: string | null;
}

export interface ReconcileTreasuryLine {
  treasuryId?: number;
  treasuryName?: string;
  amount?: number;
  [key: string]: unknown;
}

/** `POST shareholders/company-balance/reconcile-historical` report. */
export interface ReconcileHistoricalReport {
  vouchersReversed: number;
  transactionsRemoved: number;
  totalRestored: number;
  treasuries: ReconcileTreasuryLine[];
}

export interface CreateShareholderPayload {
  name: string;
  phoneNumber: string;
  address: string;
  contributedAmount: number;
  companyPercentage: number;
  capitalTreasuryId: number;
  notes: string;
}

/**
 * PUT /dashboard/shareholders/{id} body. Only descriptive fields are editable;
 * the contribution and its treasury are immutable post-creation.
 */
export interface UpdateShareholderPayload {
  name: string;
  phoneNumber: string;
  address: string;
  companyPercentage: number;
  notes: string;
}

/** Query parameters for `GET /dashboard/shareholders` — `search` matches name or phone. */
export interface ShareholdersQuery {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
}
