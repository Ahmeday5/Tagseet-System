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

export type CompanyBalanceTransactionType = 'Receipt' | 'Payment';
export type CompanyBalanceDirection = 'Deposit' | 'Withdrawal';

/**
 * Which ledger an editable company-balance line lives in — sent as `?source=`
 * on PUT/DELETE. `Voucher` is the server default; `Transfer` (legacy transfers
 * out of the company balance) must always be sent explicitly.
 */
export type CompanyBalanceEntrySource = 'Voucher' | 'Transfer';

/**
 * What kind of company-balance line is being edited — drives the edit form:
 *   - `Adjustment` deposit/withdrawal: type and treasury are editable.
 *   - `Transfer`   legacy transfer: `treasuryId` is the other treasury of the
 *                  transfer, `type` its fixed direction (`Payment` = out).
 *   - `Voucher`    any other payment voucher: treasury is ignored server-side
 *                  and the type is fixed.
 */
export type CompanyBalanceEditKind = 'Adjustment' | 'Transfer' | 'Voucher';

/** An existing company-balance line opened in the company-balance modal for editing. */
export interface CompanyBalanceEditTarget {
  id: number;
  source: CompanyBalanceEntrySource;
  kind: CompanyBalanceEditKind;
  voucherNumber: string | null;
  type: CompanyBalanceTransactionType;
  amount: number;
  /** ISO datetime as returned by the server. */
  date: string;
  treasuryId: number | null;
  treasuryName: string | null;
  capitalClassificationId: number | null;
  notes: string | null;
}

/**
 * `POST / PUT shareholders/company-balance/transactions` — Receipt = إيداع
 * (real cash into the chosen treasury, raises the company balance), Payment =
 * سحب (cash out of the treasury, lowers it).
 *
 * On edit (`PUT …/{id}`): a null `treasuryId` keeps the current treasury; a
 * null `capitalClassificationId` clears the tag, so resend the current value to
 * keep it.
 */
export interface CompanyBalanceTransactionPayload {
  type: CompanyBalanceTransactionType;
  amount: number;
  /** `yyyy-MM-dd`. */
  date: string;
  /** Required on create — which real treasury the cash moves in/out of. */
  treasuryId: number | null;
  /** Optional capital classification (تصنيف) — same list used for shareholders. */
  capitalClassificationId: number | null;
  notes: string | null;
}

/** Response of a company-balance create/edit — also the editable statement row shape. */
export interface CompanyBalanceTransactionDto {
  id: number;
  voucherNumber: string;
  type: CompanyBalanceTransactionType;
  direction: CompanyBalanceDirection;
  amount: number;
  /** Company balance immediately after this movement posted. */
  balanceAfter: number;
  /** ISO datetime as returned by the server. */
  date: string;
  treasuryId: number | null;
  treasuryName: string | null;
  capitalClassificationId: number | null;
  capitalClassificationName: string | null;
  notes: string | null;
  userName: string;
}

export interface ReconcileTreasuryLine {
  treasuryId?: number;
  treasuryName?: string;
  amount?: number;
  [key: string]: unknown;
}

/** `POST shareholders/company-balance/consolidate-historical` report (idempotent). */
export interface ConsolidateHistoricalReport {
  mergedRuns: number;
  vouchersRemoved: number;
  profitShareRowsConsolidated: number;
  vouchersCreated: number;
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
