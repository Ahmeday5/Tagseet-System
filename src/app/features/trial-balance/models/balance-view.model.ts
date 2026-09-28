import { BadgeType } from '../../../shared/components/badge/badge.component';
import { NavIconName } from '../../../shared/components/nav-icon/nav-icon.component';
import { BalanceProfit, BalanceReceivables } from './balance-check.model';

/** Presentation model derived from {@link BalanceCheck} — the view never reads the DTO directly. */

export type BalanceSideKey = 'assets' | 'obligations';

export type BalanceLineKey =
  | 'treasuries'
  | 'receivables'
  | 'inventory'
  | 'subAccounts'
  | 'shareholders'
  | 'profit'
  | 'suppliers';

export interface BalanceEntry {
  readonly id: number;
  readonly name: string;
  readonly amount: number;
  /** Secondary numeric column (quantity, open invoices …). */
  readonly meta?: number;
  readonly tag?: { readonly text: string; readonly type: BadgeType };
}

export interface BalanceEntriesSpec {
  readonly nameHeader: string;
  readonly amountHeader: string;
  /** Present only when rows carry `meta`. */
  readonly metaHeader?: string;
  readonly searchPlaceholder: string;
  readonly emptyText: string;
  readonly rows: readonly BalanceEntry[];
}

interface BalanceLineBase {
  readonly key: BalanceLineKey;
  readonly label: string;
  readonly hint: string;
  /** Short summary shown on the collapsed row ("17 خزنة", …). */
  readonly caption: string;
  readonly icon: NavIconName;
  readonly amount: number;
  /** Share of the side total, clamped to 0‒100 for bar rendering. */
  readonly share: number;
}

export type BalanceLine =
  | (BalanceLineBase & { readonly kind: 'entries'; readonly entries: BalanceEntriesSpec })
  | (BalanceLineBase & { readonly kind: 'receivables'; readonly receivables: BalanceReceivables })
  | (BalanceLineBase & { readonly kind: 'profit'; readonly profit: BalanceProfit });

export interface BalanceSideView {
  readonly key: BalanceSideKey;
  readonly title: string;
  readonly subtitle: string;
  readonly total: number;
  readonly lines: readonly BalanceLine[];
}

export interface BalanceDiagnostic {
  readonly tone: 'warn' | 'info';
  readonly title: string;
  readonly text: string;
}

export interface BalanceView {
  readonly assets: BalanceSideView;
  readonly obligations: BalanceSideView;
  readonly difference: number;
  readonly isBalanced: boolean;
  /** Known reasons the difference may be non-zero — populated only when unbalanced. */
  readonly diagnostics: readonly BalanceDiagnostic[];
}
