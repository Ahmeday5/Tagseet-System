export type CompanyProfitVoucherType = 'Receipt' | 'Payment';

/**
 * Origin of a statement line:
 *   - `Voucher`      a voucher (settlement / capitalization / deposit / withdrawal /
 *                    consolidated company profit share)
 *   - `Transfer`     a legacy treasury-to-treasury transfer
 *   - `ProfitShare`  legacy per-profit company cut — no longer emitted (the cut now
 *                    stays pending until posted in one voucher); kept for old payloads
 */
export type CompanyProfitEntrySource = 'Voucher' | 'Transfer' | 'ProfitShare';

export type CompanyProfitReferenceType =
  | 'ShareholderProfitCapitalization'
  | 'ProfitDistribution'
  /** Deposit / withdrawal on the company balance. */
  | 'CompanyCapitalAdjustment'
  /** Consolidated voucher of the company's own profit share. */
  | 'CompanyProfitShare'
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
  /**
   * Gets edit/delete actions: every deposit/withdrawal, every payment voucher
   * (incl. legacy ones) and legacy transfers out of the company balance.
   */
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
   * The company's own profit share not yet posted to its balance — it moves in
   * with the next capitalization / distribution. Absent on older backend builds.
   */
  pendingProfit?: number;
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
