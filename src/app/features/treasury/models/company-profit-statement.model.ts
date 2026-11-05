export type CompanyProfitVoucherType = 'Receipt' | 'Payment';

/** Origin of a statement line: a voucher, or a movement between treasuries. */
export type CompanyProfitEntrySource = 'Voucher' | 'Transfer';

export type CompanyProfitReferenceType =
  | 'ShareholderProfitCapitalization'
  | 'ProfitDistribution'
  | 'TransferIn'
  | 'TransferOut'
  // Forward-compatible: unknown types fall back to the raw value.
  | (string & {});

export interface CompanyProfitEntry {
  id: number;
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
  /** Set on `Transfer` lines: the treasury on the other side of the move. */
  counterpartyTreasuryName: string | null;
  notes: string | null;
}

export interface CompanyProfitStatement {
  totalReceived: number;
  totalPaid: number;
  currentBalance: number;
  /**
   * Treasury balance not accounted for by the listed lines. Expected to be 0;
   * anything else signals a data inconsistency the user must see.
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
