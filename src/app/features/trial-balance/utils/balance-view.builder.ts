import {
  TREASURY_TYPE_BADGE,
  TREASURY_TYPE_LABELS,
} from '../../treasury/constants/treasury-type-labels';
import { TreasuryType } from '../../treasury/enums/treasury-type.enum';
import { BalanceCheck, BalanceProfit } from '../models/balance-check.model';
import {
  BalanceDiagnostic,
  BalanceEntry,
  BalanceLine,
  BalanceSideView,
  BalanceView,
} from '../models/balance-view.model';
import { formatAmount, formatCount, isZeroAmount } from './balance-format.util';

/**
 * The profit figure as it *would* be without the server's zero floor:
 * gross contracts profit + revenues − expenses − distributed − commission.
 */
export function computeNetProfit(p: BalanceProfit): number {
  return (
    p.grossContractsProfit +
    p.revenues -
    p.expenses -
    p.distributedProfit -
    p.representativeCommission
  );
}

/** True when the server clamped a real loss to zero. */
export function isProfitClamped(p: BalanceProfit): boolean {
  return computeNetProfit(p) < 0 && isZeroAmount(p.totalProfit);
}

export function buildBalanceView(dto: BalanceCheck): BalanceView {
  return {
    assets: buildAssets(dto),
    obligations: buildObligations(dto),
    difference: dto.difference,
    isBalanced: dto.isBalanced,
    diagnostics: dto.isBalanced ? [] : buildDiagnostics(dto),
  };
}

// ─────────────── sides ───────────────

function buildAssets(dto: BalanceCheck): BalanceSideView {
  const a = dto.assets;
  const total = a.total;
  const stockQty = a.warehouses.reduce((s, w) => s + w.quantity, 0);

  const lines: BalanceLine[] = [
    {
      kind: 'entries',
      key: 'treasuries',
      label: 'الخزائن',
      hint: 'أرصدة كل الخزائن النقدية والبنكية — بدون خزائن الأرباح',
      caption: `${formatCount(a.treasuries.length)} خزنة`,
      icon: 'wallet',
      amount: a.treasuriesTotal,
      share: share(a.treasuriesTotal, total),
      entries: {
        nameHeader: 'الخزنة',
        amountHeader: 'الرصيد',
        searchPlaceholder: 'ابحث باسم الخزنة…',
        emptyText: 'لا توجد خزائن.',
        rows: a.treasuries.map<BalanceEntry>((t) => ({
          id: t.id,
          name: t.name,
          amount: t.balance,
          tag: treasuryTag(t.type),
        })),
      },
    },
    {
      kind: 'receivables',
      key: 'receivables',
      label: 'المستحقات',
      hint: 'إجمالي الأقساط المستحقة على العملاء ولم تُسدَّد بعد',
      caption: `${formatCount(a.receivables.contractsCount)} عقد · ${formatCount(a.receivables.installmentsCount)} قسط`,
      icon: 'file-invoice',
      amount: a.receivables.amount,
      share: share(a.receivables.amount, total),
      receivables: a.receivables,
    },
    {
      kind: 'entries',
      key: 'inventory',
      label: 'المخازن',
      hint: 'قيمة البضاعة المتاحة في المخازن بسعر الشراء',
      caption: `${formatCount(a.warehouses.length)} مخزن · ${formatCount(stockQty)} قطعة`,
      icon: 'warehouse',
      amount: a.inventoryTotal,
      share: share(a.inventoryTotal, total),
      entries: {
        nameHeader: 'المخزن',
        metaHeader: 'الكمية',
        amountHeader: 'القيمة',
        searchPlaceholder: 'ابحث باسم المخزن…',
        emptyText: 'لا توجد مخازن.',
        rows: a.warehouses.map<BalanceEntry>((w) => ({
          id: w.id,
          name: w.name,
          amount: w.value,
          meta: w.quantity,
        })),
      },
    },
    {
      kind: 'entries',
      key: 'subAccounts',
      label: 'الحسابات الفرعية',
      hint: 'صافي أرصدة الحسابات الفرعية بعد طرح الأرصدة السالبة',
      caption: `${formatCount(a.subAccounts.length)} حساب`,
      icon: 'sub-accounts',
      amount: a.subAccountsTotal,
      share: share(a.subAccountsTotal, total),
      entries: {
        nameHeader: 'الحساب',
        amountHeader: 'الرصيد',
        searchPlaceholder: 'ابحث باسم الحساب…',
        emptyText: 'لا توجد حسابات فرعية.',
        rows: a.subAccounts.map<BalanceEntry>((s) => ({
          id: s.id,
          name: s.name,
          amount: s.balance,
          tag:
            s.representativeId !== null
              ? { text: 'تابع لمندوب', type: 'info' }
              : undefined,
        })),
      },
    },
  ];

  return {
    key: 'assets',
    title: 'الأصول',
    subtitle: 'ما تملكه الشركة من نقدية ومستحقات وبضاعة',
    total,
    lines,
  };
}

function buildObligations(dto: BalanceCheck): BalanceSideView {
  const o = dto.obligations;
  const total = o.total;
  const openInvoices = o.suppliers.reduce((s, x) => s + x.openInvoicesCount, 0);

  const lines: BalanceLine[] = [
    {
      kind: 'entries',
      key: 'shareholders',
      label: 'رأس مال الشركاء',
      hint: 'إجمالي مساهمات الشركاء في رأس المال',
      caption: `${formatCount(o.shareholders.length)} شريك`,
      icon: 'hand-coin',
      amount: o.shareholdersCapitalTotal,
      share: share(o.shareholdersCapitalTotal, total),
      entries: {
        nameHeader: 'الشريك',
        amountHeader: 'المساهمة',
        searchPlaceholder: 'ابحث باسم الشريك…',
        emptyText: 'لا يوجد شركاء.',
        rows: o.shareholders.map<BalanceEntry>((s) => ({
          id: s.id,
          name: s.name,
          amount: s.contributedAmount,
        })),
      },
    },
    {
      kind: 'profit',
      key: 'profit',
      label: 'الأرباح',
      hint: 'صافي الأرباح غير الموزعة بعد المصروفات والعمولات',
      caption: isProfitClamped(o.profit) ? 'خسارة محتسبة صفرًا' : 'صافي بعد الخصومات',
      icon: 'trending-up',
      amount: o.profit.totalProfit,
      share: share(o.profit.totalProfit, total),
      profit: o.profit,
    },
    {
      kind: 'entries',
      key: 'suppliers',
      label: 'مستحقات الموردين',
      hint: 'المتبقي للموردين على الفواتير المفتوحة',
      caption:
        o.suppliers.length === 0
          ? 'لا توجد مستحقات'
          : `${formatCount(o.suppliers.length)} مورد · ${formatCount(openInvoices)} فاتورة`,
      icon: 'truck',
      amount: o.supplierPayablesTotal,
      share: share(o.supplierPayablesTotal, total),
      entries: {
        nameHeader: 'المورد',
        metaHeader: 'فواتير مفتوحة',
        amountHeader: 'المتبقي',
        searchPlaceholder: 'ابحث باسم المورد…',
        emptyText: 'لا توجد مستحقات للموردين.',
        rows: o.suppliers.map<BalanceEntry>((s) => ({
          id: s.id,
          name: s.name,
          amount: s.remaining,
          meta: s.openInvoicesCount,
        })),
      },
    },
  ];

  return {
    key: 'obligations',
    title: 'الالتزامات',
    subtitle: 'ما على الشركة من رأس مال وأرباح ومستحقات',
    total,
    lines,
  };
}

// ─────────────── diagnostics ───────────────

/**
 * Known, structural reasons the two sides can drift apart. They're hints
 * for the reviewer, not proof — each is shown only when its trigger
 * condition is present in the current snapshot.
 */
function buildDiagnostics(dto: BalanceCheck): BalanceDiagnostic[] {
  const profit = dto.obligations.profit;
  const out: BalanceDiagnostic[] = [];

  if (profit.distributedProfit > 0) {
    out.push({
      tone: 'info',
      title: 'الأرباح الموزعة ما زالت في الخزائن',
      text:
        `عند توزيع الأرباح تُخصم حصص المساهمين (${formatAmount(profit.distributedProfit)}) ` +
        'من إجمالي الأرباح فورًا، بينما تظل المبالغ نفسها في الخزائن حتى تُصرف فعليًا، ' +
        'فترتفع الأصول عن الالتزامات بقيمة الجزء غير المصروف منها.',
    });
  }

  if (isProfitClamped(profit)) {
    out.push({
      tone: 'warn',
      title: 'خسارة غير محتسبة في الأرباح',
      text:
        `صافي الأرباح الفعلي ${formatAmount(computeNetProfit(profit))} (خسارة)، ` +
        'لكن إجمالي الأرباح لا يقل عن الصفر فيُحتسب صفرًا، ' +
        'فتظهر قيمة الخسارة كفرق بين الأصول والالتزامات.',
    });
  }

  if (out.length === 0) {
    out.push({
      tone: 'warn',
      title: 'فرق غير مفسَّر',
      text:
        'لا ينطبق أي من الأسباب المعروفة على الوضع الحالي. ' +
        'راجع آخر العمليات المسجلة (السندات، التحويلات، الفواتير، العقود) ' +
        'منذ آخر مرة كان فيها الميزان متوازنًا.',
    });
  }

  return out;
}

// ─────────────── helpers ───────────────

function share(amount: number, total: number): number {
  if (!(total > 0) || !(amount > 0)) return 0;
  return Math.min(100, (amount / total) * 100);
}

function treasuryTag(type: string): BalanceEntry['tag'] {
  const known = type as TreasuryType;
  const text = TREASURY_TYPE_LABELS[known];
  return text ? { text, type: TREASURY_TYPE_BADGE[known] } : undefined;
}
