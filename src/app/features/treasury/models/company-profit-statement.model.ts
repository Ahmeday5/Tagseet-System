export type CompanyProfitVoucherType = 'Receipt' | 'Payment';

/**
 * Origin of a statement line:
 *   - `Voucher`      a voucher (settlement / capitalization / deposit / withdrawal)
 *   - `Transfer`     a treasury-to-treasury transfer
 *   - `ProfitShare`  the company's own cut of a recorded profit
 */
export type CompanyProfitEntrySource = 'Voucher' | 'Transfer' | 'ProfitShare';

export type CompanyProfitReferenceType =
  | 'ShareholderProfitCapitalization'
  | 'ProfitDistribution'
  | 'TransferIn'
  | 'TransferOut'
  // Forward-compatible: unknown types fall back to the raw value.
  | (string & {});

export interface CompanyProfitEntry {
  id: number;
  voucherNumber: string | null;
  date: string;
  source: CompanyProfitEntrySource;
  voucherType: CompanyProfitVoucherType;
  amount: number;
  balanceAfter: number;
  referenceType: CompanyProfitReferenceType;
  referenceId: number;
  /** Set on `Voucher` lines tied to a shareholder; null otherwise. */
  shareholderId: number | null;
  shareholderName: string | null;
  /**
   * The treasury the money came from / went to (deposits, withdrawals and
   * treasury transfers). Null for legacy manual rows and ledger-only entries.
   */
  counterpartyTreasuryId: number | null;
  counterpartyTreasuryName: string | null;
  capitalClassificationId: number | null;
  capitalClassificationName: string | null;
  /** True only for manual deposit/withdrawal rows — these get edit/delete actions. */
  isEditable: boolean;
  notes: string | null;
}

export interface CompanyProfitStatement {
  /** Within the selected period when `fromDate`/`toDate` are set; otherwise all movements. */
  totalReceived: number;
  totalPaid: number;
  /** totalReceived − totalPaid (within the selected period). */
  netBalance: number;
  /** Company's current balance — NOT affected by the date filter. */
  currentBalance: number;
  /**
   * Treasury balance not accounted for by the listed lines — always computed
   * over all movements. Expected to be 0; anything else signals a data
   * inconsistency the user must see.
   */
  unexplainedDifference: number;
  entries: {
    pageIndex: number;
    pageSize: number;
    count: number;
    totalPages: number;
    data: CompanyProfitEntry[];
  };
}

export interface CompanyProfitStatementQuery {
  pageIndex?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
}
