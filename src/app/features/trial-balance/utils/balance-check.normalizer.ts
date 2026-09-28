import {
  BalanceCheck,
  BalanceProfit,
  BalanceReceivables,
  BalanceShareholder,
  BalanceSubAccount,
  BalanceSupplier,
  BalanceTreasury,
  BalanceWarehouse,
} from '../models/balance-check.model';

type RawRecord = Record<string, unknown>;

/**
 * Coerces the raw `balance-check` payload into a fully-populated
 * {@link BalanceCheck}. Missing lists become `[]` and missing / non-numeric
 * amounts become `0`, so the view never has to null-guard. Supplier rows
 * accept a few field-name aliases because that list ships empty today and
 * its exact contract hasn't been exercised yet.
 */
export function normalizeBalanceCheck(raw: unknown): BalanceCheck {
  const root = asRecord(raw);
  const assets = asRecord(root['assets']);
  const obligations = asRecord(root['obligations']);
  const difference = num(root['difference']);

  return {
    assets: {
      treasuriesTotal: num(assets['treasuriesTotal']),
      treasuries: list(assets['treasuries'], toTreasury),
      receivables: toReceivables(asRecord(assets['receivables'])),
      inventoryTotal: num(assets['inventoryTotal']),
      warehouses: list(assets['warehouses'], toWarehouse),
      subAccountsTotal: num(assets['subAccountsTotal']),
      subAccounts: list(assets['subAccounts'], toSubAccount),
      total: num(assets['total']),
    },
    obligations: {
      shareholdersCapitalTotal: num(obligations['shareholdersCapitalTotal']),
      shareholders: list(obligations['shareholders'], toShareholder),
      profit: toProfit(asRecord(obligations['profit'])),
      supplierPayablesTotal: num(obligations['supplierPayablesTotal']),
      suppliers: list(obligations['suppliers'], toSupplier),
      total: num(obligations['total']),
    },
    difference,
    isBalanced:
      typeof root['isBalanced'] === 'boolean'
        ? root['isBalanced']
        : Math.abs(difference) < 0.005,
  };
}

function toTreasury(r: RawRecord): BalanceTreasury {
  return {
    id: num(r['id']),
    name: str(r['name']),
    type: str(r['type']),
    balance: num(r['balance']),
  };
}

function toReceivables(r: RawRecord): BalanceReceivables {
  return {
    amount: num(r['amount']),
    contractsCount: num(r['contractsCount']),
    installmentsCount: num(r['installmentsCount']),
  };
}

function toWarehouse(r: RawRecord): BalanceWarehouse {
  return {
    id: num(r['id']),
    name: str(r['name']),
    quantity: num(r['quantity']),
    value: num(r['value']),
  };
}

function toSubAccount(r: RawRecord): BalanceSubAccount {
  const repId = r['representativeId'];
  return {
    id: num(r['id']),
    name: str(r['name']),
    representativeId: repId === null || repId === undefined ? null : num(repId),
    balance: num(r['balance']),
  };
}

function toShareholder(r: RawRecord): BalanceShareholder {
  return {
    id: num(r['id']),
    name: str(r['name']),
    contributedAmount: num(r['contributedAmount']),
  };
}

function toProfit(r: RawRecord): BalanceProfit {
  return {
    grossContractsProfit: num(r['grossContractsProfit']),
    revenues: num(r['revenues']),
    expenses: num(r['expenses']),
    distributedProfit: num(r['distributedProfit']),
    representativeCommission: num(r['representativeCommission']),
    totalProfit: num(r['totalProfit']),
  };
}

function toSupplier(r: RawRecord): BalanceSupplier {
  return {
    id: num(r['id'] ?? r['supplierId']),
    name: str(r['name'] ?? r['supplierName']),
    openInvoicesCount: num(
      r['openInvoicesCount'] ?? r['openInvoices'] ?? r['invoicesCount'],
    ),
    remaining: num(
      r['remaining'] ?? r['remainingAmount'] ?? r['amount'] ?? r['balance'],
    ),
  };
}

// ─────────────── primitives ───────────────

function asRecord(value: unknown): RawRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
}

function list<T>(value: unknown, map: (r: RawRecord) => T): T[] {
  return Array.isArray(value) ? value.map((v) => map(asRecord(v))) : [];
}

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
}
