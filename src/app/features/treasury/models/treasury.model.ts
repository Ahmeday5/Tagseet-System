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
  transactions?: TreasuryTransaction[];
  vouchers?: TreasurySummary[];
}

/** POST /dashboard/treasuries — `initialBalance` is set ONCE at creation. */
export interface CreateTreasuryPayload {
  name: string;
  initialBalance: number;
  type: TreasuryType;
  isActive: boolean;
}

/** PUT /dashboard/treasuries/{id} — balance is server-managed, not editable. */
export interface UpdateTreasuryPayload {
  name: string;
  type: TreasuryType;
  isActive: boolean;
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

export interface Shareholder {
  id: string;
  name: string;
  phone: string;
  address: string;
  creditAmount: number; // له (دائن)
  debitAmount: number; // عليه (مدين)
  ownershipPct: number; // نسبة الملكية %
  note: string;
}
