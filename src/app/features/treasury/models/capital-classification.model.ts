import { PagedResponse } from '../../../core/models/api-response.model';
import { CapitalTransactionType } from './capital-transaction.model';

/** Row / detail shape of `GET shareholders/capital-classifications[/{id}]`. */
export interface CapitalClassification {
  id: number;
  name: string;
  notes: string | null;
  createdAt: string;
  /** Number of capital movements tagged with this classification. */
  transactionsCount: number;
}

/** POST / PUT body. */
export interface SaveCapitalClassificationPayload {
  name: string;
  notes: string | null;
}

export interface CapitalClassificationsQuery {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
}

/** One movement in the classification's company-wide ledger. */
export interface CapitalClassificationStatementEntry {
  id: number;
  voucherNumber: string;
  date: string;
  shareholderId: number;
  shareholderName: string;
  transactionType: CapitalTransactionType | string;
  transactionTypeAr: string | null;
  amount: number;
  /** Deposit → positive, withdrawal → negative. */
  signedAmount: number;
  runningBalance: number;
  treasuryName: string | null;
  notes: string | null;
}

/** `GET shareholders/capital-classifications/{id}/statement`. */
export interface CapitalClassificationStatement {
  classification: CapitalClassification;
  totalDeposits: number;
  totalWithdrawals: number;
  netBalance: number;
  entries: PagedResponse<CapitalClassificationStatementEntry>;
}

export interface CapitalClassificationStatementQuery {
  pageIndex?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
}
