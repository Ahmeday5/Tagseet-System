import { BadgeType } from '../../../shared/components/badge/badge.component';
import {
  CompanyProfitEntry,
  CompanyProfitEntrySource,
  CompanyProfitReferenceType,
  CompanyProfitVoucherType,
} from '../models/company-profit-statement.model';

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
};

const REFERENCE_TYPE_BADGE: Readonly<Record<string, BadgeType>> = {
  ShareholderProfitCapitalization: 'purple',
  ProfitDistribution: 'teal',
  TransferIn: 'ok',
  TransferOut: 'warn',
  CompanyCapitalAdjustment: 'info',
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
 * Human label for the statement line's origin. `ProfitShare` is the company's
 * own cut of a recorded profit — a credit normally, a debit on a reversal.
 */
export function sourceLabel(
  source: CompanyProfitEntrySource,
  voucherType: CompanyProfitVoucherType,
): string {
  if (source === 'ProfitShare') {
    return voucherType === 'Payment'
      ? 'نصيب الشركة من المصروفات'
      : 'نصيب الشركة من الأرباح';
  }
  if (source === 'Transfer') return 'تحويل خزائن';
  return 'سند';
}

export function sourceBadge(source: CompanyProfitEntrySource): BadgeType {
  if (source === 'ProfitShare') return 'teal';
  if (source === 'Transfer') return 'warn';
  return 'info';
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
    sourceLabel: sourceLabel(entry.source, entry.voucherType),
    sourceBadge: sourceBadge(entry.source),
    referenceLabel: referenceTypeLabel(entry.referenceType),
    referenceBadge: referenceTypeBadge(entry.referenceType),
    counterparty: companyProfitCounterparty(entry),
    classification: entry.capitalClassificationName || EMPTY,
    isTransfer: entry.source === 'Transfer',
    isEditable: entry.isEditable === true,
  };
}
