export type TransactionType = 'income' | 'expense' | 'transfer';

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
  creditAmount: number;   // له (دائن)
  debitAmount: number;    // عليه (مدين)
  ownershipPct: number;   // نسبة الملكية %
  note: string;
}
