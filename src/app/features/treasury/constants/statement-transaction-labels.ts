import { BadgeType } from '../../../shared/components/badge/badge.component';
import { StatementTransactionType } from '../models/shareholder-statement.model';

export const STATEMENT_TX_LABELS: Readonly<Record<StatementTransactionType, string>> = {
  CapitalDeposit: 'إيداع رأس مال',
  CapitalWithdrawal: 'سحب رأس مال',
  ProfitCapitalization: 'ترحيل أرباح',
  ProfitDistribution: 'توزيع أرباح',
  DistributedProfitReinvestment: 'إعادة استثمار أرباح موزعة',
  DistributedProfitWithdrawal: 'سحب أرباح موزعة',
};

/** Options for the statement's type filter, in display order. */
export const STATEMENT_TX_OPTIONS: readonly StatementTransactionType[] = [
  'CapitalDeposit',
  'CapitalWithdrawal',
  'ProfitCapitalization',
  'ProfitDistribution',
  'DistributedProfitReinvestment',
  'DistributedProfitWithdrawal',
];

export const STATEMENT_TX_BADGE: Readonly<Record<StatementTransactionType, BadgeType>> = {
  CapitalDeposit: 'ok',
  CapitalWithdrawal: 'bad',
  ProfitCapitalization: 'purple',
  ProfitDistribution: 'teal',
  DistributedProfitReinvestment: 'purple',
  DistributedProfitWithdrawal: 'bad',
};

/** Returns true when the transaction adds to or pays out from the shareholder's stake. */
export function isStatementInflow(type: StatementTransactionType): boolean {
  return type !== 'CapitalWithdrawal' && type !== 'DistributedProfitWithdrawal';
}
