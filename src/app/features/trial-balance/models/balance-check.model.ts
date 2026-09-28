import { TreasuryType } from '../../treasury/enums/treasury-type.enum';

/**
 * `GET dashboard/balance-check` — the company-wide reconciliation snapshot.
 * Invariant: `assets.total − obligations.total = difference`, which must be 0.
 * Admin-only server-side; a Representative receives 403.
 */
export interface BalanceCheck {
  readonly assets: BalanceAssets;
  readonly obligations: BalanceObligations;
  readonly difference: number;
  readonly isBalanced: boolean;
}

export interface BalanceAssets {
  /** Every treasury except the profit treasuries. */
  readonly treasuriesTotal: number;
  readonly treasuries: readonly BalanceTreasury[];
  readonly receivables: BalanceReceivables;
  /** Warehouses valued at purchase price. */
  readonly inventoryTotal: number;
  readonly warehouses: readonly BalanceWarehouse[];
  /** Net of all sub-account balances (may include negative accounts). */
  readonly subAccountsTotal: number;
  readonly subAccounts: readonly BalanceSubAccount[];
  readonly total: number;
}

export interface BalanceObligations {
  readonly shareholdersCapitalTotal: number;
  readonly shareholders: readonly BalanceShareholder[];
  readonly profit: BalanceProfit;
  readonly supplierPayablesTotal: number;
  readonly suppliers: readonly BalanceSupplier[];
  readonly total: number;
}

export interface BalanceTreasury {
  readonly id: number;
  readonly name: string;
  readonly type: TreasuryType | string;
  readonly balance: number;
}

export interface BalanceReceivables {
  readonly amount: number;
  readonly contractsCount: number;
  /** Installments not yet (fully) paid. */
  readonly installmentsCount: number;
}

export interface BalanceWarehouse {
  readonly id: number;
  readonly name: string;
  readonly quantity: number;
  readonly value: number;
}

export interface BalanceSubAccount {
  readonly id: number;
  readonly name: string;
  readonly representativeId: number | null;
  readonly balance: number;
}

export interface BalanceShareholder {
  readonly id: number;
  readonly name: string;
  readonly contributedAmount: number;
}

export interface BalanceProfit {
  readonly grossContractsProfit: number;
  readonly revenues: number;
  readonly expenses: number;
  readonly distributedProfit: number;
  readonly representativeCommission: number;
  /** Server-side result — floored at 0, so a loss is reported as 0. */
  readonly totalProfit: number;
}

export interface BalanceSupplier {
  readonly id: number;
  readonly name: string;
  readonly openInvoicesCount: number;
  readonly remaining: number;
}
