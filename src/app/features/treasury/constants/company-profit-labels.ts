import { BadgeType } from '../../../shared/components/badge/badge.component';
import {
  CompanyProfitEntry,
  CompanyProfitReferenceType,
  CompanyProfitVoucherType,
} from '../models/company-profit-statement.model';
import {
  CompanyBalanceEditKind,
  CompanyBalanceEditTarget,
} from '../models/shareholder.model';

export const COMPANY_PROFIT_VOUCHER_LABELS: Readonly<
  Record<CompanyProfitVoucherType, string>
> = {
  Receipt: 'قبض',
  Payment: 'صرف',
};

export const COMPANY_PROFIT_VOUCHER_BADGE: Readonly<
  Record<CompanyProfitVoucherType, BadgeType>
> = {
  Receipt: 'ok',
  Payment: 'bad',
};

const REFERENCE_TYPE_LABELS: Readonly<Record<string, string>> = {
  ShareholderProfitCapitalization: 'ترحيل أرباح مساهم',
  ProfitDistribution: 'توزيع أرباح',
  TransferIn: 'تحويل وارد',
  TransferOut: 'تحويل صادر',
  CompanyCapitalAdjustment: 'تعديل رصيد الشركة',
  CompanyProfitShare: 'نصيب الشركة من الأرباح (مُجمّع)',
};

/**
 * Capitalization / distribution post the company's whole cut as ONE voucher
 * with no shareholder — labelled as the company's share, not a partner's.
 */
const COMPANY_POSTING_LABELS: Readonly<Record<string, string>> = {
  ShareholderProfitCapitalization: 'ترحيل أرباح (نصيب الشركة)',
  ProfitDistribution: 'توزيع أرباح (نصيب الشركة)',
};

const REFERENCE_TYPE_BADGE: Readonly<Record<string, BadgeType>> = {
  ShareholderProfitCapitalization: 'purple',
  ProfitDistribution: 'teal',
  TransferIn: 'ok',
  TransferOut: 'warn',
  CompanyCapitalAdjustment: 'info',
  CompanyProfitShare: 'teal',
};

const TREASURY_PREFIX = 'خزنة: ';
const EMPTY = '—';

export function referenceTypeLabel(type: CompanyProfitReferenceType): string {
  return REFERENCE_TYPE_LABELS[type] ?? type;
}

export function referenceTypeBadge(type: CompanyProfitReferenceType): BadgeType {
  return REFERENCE_TYPE_BADGE[type] ?? 'info';
}

export function isCompanyProfitInflow(type: CompanyProfitVoucherType): boolean {
  return type === 'Receipt';
}

/**
 * Human label for the statement line's origin. Vouchers are named after what
 * produced them (the voucher number is a plain serial and says nothing about
 * it); legacy `ProfitShare` rows are the company's per-profit cut.
 */
export function sourceLabel(entry: CompanyProfitEntry): string {
  if (entry.source === 'ProfitShare') {
    return entry.voucherType === 'Payment'
      ? 'نصيب الشركة من المصروفات'
      : 'نصيب الشركة من الأرباح';
  }
  if (entry.source === 'Transfer') return 'تحويل خزائن';
  const companyPosting =
    entry.shareholderId == null ? COMPANY_POSTING_LABELS[entry.referenceType] : undefined;
  return companyPosting ?? REFERENCE_TYPE_LABELS[entry.referenceType] ?? 'سند';
}

export function sourceBadge(entry: CompanyProfitEntry): BadgeType {
  if (entry.source === 'ProfitShare') return 'teal';
  if (entry.source === 'Transfer') return 'warn';
  return REFERENCE_TYPE_BADGE[entry.referenceType] ?? 'info';
}

/** How an editable line is edited — see {@link CompanyBalanceEditKind}. */
export function companyBalanceEditKind(entry: CompanyProfitEntry): CompanyBalanceEditKind {
  if (entry.source === 'Transfer') return 'Transfer';
  return entry.referenceType === 'CompanyCapitalAdjustment' ? 'Adjustment' : 'Voucher';
}

/** Projects an editable statement line onto what the company-balance modal edits. */
export function toCompanyBalanceEditTarget(entry: CompanyProfitEntry): CompanyBalanceEditTarget {
  return {
    id: entry.id,
    source: entry.source === 'Transfer' ? 'Transfer' : 'Voucher',
    kind: companyBalanceEditKind(entry),
    voucherNumber: entry.voucherNumber,
    type: entry.voucherType,
    amount: entry.amount,
    date: entry.date,
    treasuryId: entry.counterpartyTreasuryId,
    treasuryName: entry.counterpartyTreasuryName,
    capitalClassificationId: entry.capitalClassificationId,
    notes: entry.notes,
  };
}

/**
 * Who / what is on the other side of the line: the counterparty treasury when
 * one is recorded (deposits, withdrawals, transfers), else the shareholder.
 */
export function companyProfitCounterparty(entry: CompanyProfitEntry): string {
  if (entry.counterpartyTreasuryName) {
    return `${TREASURY_PREFIX}${entry.counterpartyTreasuryName}`;
  }
  return entry.shareholderName || EMPTY;
}

/** Display-ready statement line — resolved once per fetch, not per change detection. */
export interface CompanyProfitEntryRow {
  readonly entry: CompanyProfitEntry;
  readonly inflow: boolean;
  readonly voucherLabel: string;
  readonly voucherBadge: BadgeType;
  readonly sourceLabel: string;
  readonly sourceBadge: BadgeType;
  readonly referenceLabel: string;
  readonly referenceBadge: BadgeType;
  readonly counterparty: string;
  readonly classification: string;
  readonly isTransfer: boolean;
  readonly isEditable: boolean;
}

export function toCompanyProfitEntryRow(entry: CompanyProfitEntry): CompanyProfitEntryRow {
  return {
    entry,
    inflow: isCompanyProfitInflow(entry.voucherType),
    voucherLabel: COMPANY_PROFIT_VOUCHER_LABELS[entry.voucherType] ?? entry.voucherType,
    voucherBadge: COMPANY_PROFIT_VOUCHER_BADGE[entry.voucherType] ?? 'info',
    sourceLabel: sourceLabel(entry),
    sourceBadge: sourceBadge(entry),
    referenceLabel: referenceTypeLabel(entry.referenceType),
    referenceBadge: referenceTypeBadge(entry.referenceType),
    counterparty: companyProfitCounterparty(entry),
    classification: entry.capitalClassificationName || EMPTY,
    isTransfer: entry.source === 'Transfer',
    isEditable: entry.isEditable === true,
  };
}
