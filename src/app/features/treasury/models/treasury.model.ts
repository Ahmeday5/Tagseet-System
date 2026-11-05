import { TreasuryType } from '../enums/treasury-type.enum';

export type TransactionType = 'income' | 'expense' | 'transfer';

/**
 * Treasury entity exactly as returned by `GET /dashboard/treasuries`.
 * No separate "view" DTO — the API shape *is* the view model.
 *
 * `transactions` and `vouchers` are returned as empty arrays by the
 * backend today; typed as optional so they can grow without breaking
 * existing call-sites.
 */
export interface Treasury {
  id: number;
  name: string;
  currentBalance: number;
  type: TreasuryType;
  isActive: boolean;
  /** Set only for `SubRepresentative` treasuries; null otherwise. */
  representativeId?: number | null;
  /** Display name of the linked representative (sub-rep treasuries only). */
  representative?: string | null;
  transactions?: TreasuryTransaction[];
  vouchers?: TreasurySummary[];
}

/**
 * POST /dashboard/treasuries — `initialBalance` is set ONCE at creation.
 * `representativeId` is sent ONLY for `SubRepresentative` treasuries and is
 * `null` for every other type.
 */
export interface CreateTreasuryPayload {
  name: string;
  initialBalance: number;
  type: TreasuryType;
  isActive: boolean;
  representativeId: number | null;
}

/**
 * PUT /dashboard/treasuries/{id} — balance is server-managed, not editable.
 * `representativeId` follows the same rule as on create.
 */
export interface UpdateTreasuryPayload {
  name: string;
  type: TreasuryType;
  isActive: boolean;
  representativeId: number | null;
}

export interface TreasuryTransaction {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  amount: number;
  balance: number;
  category: string;
}

export interface TreasurySummary {
  mainBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashflow: number;
  vatCollected: number;
  vatPaid: number;
}

/* ════════════════════════════════════════════════════════════════
   Treasury transfers (inter-treasury money movements)
   ════════════════════════════════════════════════════════════════ */

/** Row shape returned by `GET /dashboard/treasuries/transfers`. */
export interface TreasuryTransfer {
  id: number;
  fromTreasuryId: number;
  fromTreasuryName: string;
  toTreasuryId: number;
  toTreasuryName: string;
  amount: number;
  /** ISO date (server returns date-only or full ISO depending on field). */
  transferDate: string;
  notes: string | null;
  createdAt: string;
}

/** POST /dashboard/treasuries/transfers body. */
export interface CreateTreasuryTransferPayload {
  fromTreasuryId: number;
  toTreasuryId: number;
  amount: number;
  /** `yyyy-MM-dd` — the backend expects a calendar date, not a timestamp. */
  transferDate: string;
  notes: string;
}

/**
 * PUT /dashboard/treasuries/transfers/{id} body. Omitting `transferDate`
 * keeps the stored date; `notes` is written as sent — `null` clears it.
 */
export interface UpdateTreasuryTransferPayload {
  fromTreasuryId: number;
  toTreasuryId: number;
  amount: number;
  transferDate?: string;
  notes: string | null;
}

/** Query parameters for the paginated transfers list. */
export interface TreasuryTransfersQuery {
  pageIndex?: number;
  pageSize?: number;
  fromTreasuryId?: number | '';
  toTreasuryId?: number | '';
  /** `yyyy-MM-dd` — inclusive lower bound. */
  from?: string;
  /** `yyyy-MM-dd` — inclusive upper bound. */
  to?: string;
}

/* ════════════════════════════════════════════════════════════════
   Treasury operations (all transactions/movements)
   ════════════════════════════════════════════════════════════════ */

/** Counterparty of a treasury operation (`Treasury` = the other leg of an inter-treasury transfer). */
export type OperationPartyType =
  | 'Customer'
  | 'Supplier'
  | 'Shareholder'
  | 'SubAccount'
  | 'Representative'
  | 'Treasury';

/** Row shape returned by `GET /dashboard/treasuries/operations`. */
export interface TreasuryOperation {
  id: number;
  description: string;
  amount: number;
  signedAmount: number; // positive for Receipt, negative for Payment
  direction: 'Payment' | 'Receipt';
  date: string; // ISO datetime, UTC
  userName: string;
  /** Computed server-side at request time; shifts when sibling operations change. */
  balanceAfter: number;
  treasuryId: number;
  treasuryName: string;
  partyName: string | null;
  partyType: OperationPartyType | null;
  partyId: number | null;
  /** Source document of the operation (informational). */
  referenceType: string;
  referenceId: number | null;
  /** False when the operation must be edited/deleted from its originating screen. */
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * PUT /dashboard/treasuries/operations/{id} body. `date` (`YYYY-MM-DD`) equal
 * to the original or `null` keeps the stored date and time; `notes` replaces
 * the stored description as sent.
 */
export interface UpdateTreasuryOperationPayload {
  amount: number;
  date: string | null;
  notes: string | null;
}

/** Query parameters for the paginated operations list. */
export interface TreasuryOperationsQuery {
  pageIndex?: number;
  pageSize?: number;
  treasuryId?: number | '';
  /** `yyyy-MM-dd` — inclusive lower bound. */
  from?: string;
  /** `yyyy-MM-dd` — inclusive upper bound. */
  to?: string;
}

/* ════════════════════════════════════════════════════════════════
   Profits screen — GET dashboard/treasuries/monthly-profits
   ════════════════════════════════════════════════════════════════ */

/** Query for the profits screen. Omitted fields fall back server-side. */
export interface ProfitsScreenQuery {
  /** Defaults to the current year on the backend. */
  year?: number;
  /**
   * Admin-only filter. Must never be sent for a Representative — the
   * backend scopes them to themselves and answers 403 for anyone else.
   */
  representativeId?: number;
}

/*
 * Every money figure below may be negative (expenses exceeding profits) —
 * render it as-is, never clamp to zero.
 */

export interface RepresentativeProfit {
  representativeId: number;
  representativeName: string;
  amount: number;
}

/** A representative's monthly share, broken down by source. */
export interface RepresentativeProfitBreakdown extends RepresentativeProfit {
  /** Commission earned on contracts. */
  fromContracts: number;
  /** Their share of direct revenues (added). */
  fromRevenues: number;
  /** Their share of expenses (subtracted). */
  fromExpenses: number;
}

/** Profits accrued to a shareholder but not yet settled. */
export interface ShareholderPendingProfit {
  shareholderId?: number;
  shareholderName: string;
  accruedProfit: number;
  companyPercentage: number;
  companyShare: number;
  shareholderShare: number;
}

/** A shareholder's slice of one month's (or the year's) shareholders pool. */
export interface ShareholderProfitShare {
  shareholderId?: number;
  shareholderName: string;
  contributionPercentage: number;
  poolShare: number;
  companyPercentage: number;
  companyShare: number;
  shareholderShare: number;
}

export interface ProfitTreasuries {
  /** Profits not yet settled — company + shareholders pending shares. */
  profitsTreasury: number;
  companyPendingShare: number;
  shareholdersPendingShare: number;
  /** Settled company profits only — excludes `companyPendingShare`. */
  companyProfitsTreasury: number;
  /** companyProfitsTreasury + companyPendingShare. */
  companyTotalProfit: number;
  representativesProfitsTotal: number;
  /** Unpaid commission per representative — also drives the dynamic columns. */
  representatives: RepresentativeProfit[];
  /** Breakdown of `profitsTreasury`; empty when scoped to a representative. */
  shareholders: ShareholderPendingProfit[];
}

export interface ProfitsSummary {
  /** Sales profits + direct revenues for the year. */
  totalProfits: number;
  distributedProfits: number;
  /** totalProfits − distributedProfits. */
  currentProfits: number;
  collectedProfits: number;
  directRevenues: number;
  expenses: number;
  /** collectedProfits + directRevenues − expenses. */
  netProfits: number;
}

/** Arabic description of how a figure is computed. */
export interface ProfitExplanation {
  /** PascalCase dotted path, e.g. `MonthlySalesProfits.NetProfit`. */
  field: string;
  title: string;
  formula: string;
}

/** Common to every monthly row; `month` is 0 on the yearly total row. */
interface MonthlyRowBase {
  month: number;
  monthName: string;
  isCurrentMonth: boolean;
}

export interface MonthlySalesProfit extends MonthlyRowBase {
  cashProfit: number;
  installmentProfit: number;
  /** cashProfit + installmentProfit. */
  salesProfit: number;
  /** collectedFromInstallments + collectedFromCashSales. */
  collectedProfit: number;
  collectedFromInstallments: number;
  collectedFromCashSales: number;
  directRevenues: number;
  expenses: number;
  /** collectedProfit + directRevenues − expenses. */
  netProfit: number;
}

export interface MonthlyProfitDistribution extends MonthlyRowBase {
  netProfit: number;
  representativesProfit: number;
  /** netProfit − representativesProfit. 0 when scoped to a representative. */
  shareholdersPool: number;
  /** Company's cut of the pool. 0 when scoped to a representative. */
  companyProfit: number;
  /** 0 when scoped to a representative. */
  shareholdersProfit: number;
  /** companyProfit + shareholdersProfit + representativesProfit (= netProfit company-wide). */
  distributedProfit: number;
  representatives: RepresentativeProfitBreakdown[];
  /** Empty when scoped to a representative. */
  shareholders: ShareholderProfitShare[];
}

export interface MonthlyTable<T> {
  /** Always 12 rows, January → December. */
  months: T[];
  /** "إجمالي أرباح العام" row. */
  total: T;
}

export interface ProfitsScreen {
  year: number;
  treasuries: ProfitTreasuries;
  summary: ProfitsSummary;
  monthlySalesProfits: MonthlyTable<MonthlySalesProfit>;
  monthlyProfitDistribution: MonthlyTable<MonthlyProfitDistribution>;
  explanations: ProfitExplanation[];
}
