import { environment } from '../../../../environments/environment';
import {
  CapitalClassificationStatement,
  CapitalClassificationStatementEntry,
} from '../models/capital-classification.model';

const SEPARATOR = '────────────';

function money(value: number | null | undefined): string {
  return `${Math.round(value ?? 0).toLocaleString('ar-EG')} ${environment.currency}`;
}

function signedMoney(value: number): string {
  return `${value < 0 ? '−' : '+'}${money(Math.abs(value))}`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('ar-EG');
}

/** Movement type label — the server's Arabic label, else derived from the sign. */
export function classificationEntryTypeLabel(e: CapitalClassificationStatementEntry): string {
  return e.transactionTypeAr || ((e.signedAmount ?? 0) >= 0 ? 'إيداع' : 'سحب');
}

/**
 * Full classification statement as WhatsApp text: header, every movement
 * numbered in statement order (same serials as the on-screen table), then the
 * period totals. A classification has no owner/phone, so the user picks the chat.
 */
export function buildClassificationWhatsappMessage(
  classificationName: string,
  totals: Pick<CapitalClassificationStatement, 'totalDeposits' | 'totalWithdrawals' | 'netBalance'>,
  entries: readonly CapitalClassificationStatementEntry[],
  period: string,
): string {
  const lines = [`*كشف حساب تصنيف — ${classificationName}*`, period, SEPARATOR];

  if (entries.length === 0) {
    lines.push('لا توجد حركات.');
  }
  entries.forEach((e, i) => {
    lines.push(
      `*${i + 1})* ${shortDate(e.date)} — ${classificationEntryTypeLabel(e)} — ${e.shareholderName}`,
      `المبلغ: ${signedMoney(e.signedAmount ?? 0)} | الرصيد: ${money(e.runningBalance)}`,
    );
    if (e.treasuryName) lines.push(`الخزينة: ${e.treasuryName}`);
    if (e.notes) lines.push(`ملاحظات: ${e.notes}`);
    lines.push('');
  });

  lines.push(
    SEPARATOR,
    `عدد الحركات: ${entries.length.toLocaleString('ar-EG')}`,
    `إجمالي الإيداعات: ${money(totals.totalDeposits)}`,
    `إجمالي السحوبات: ${money(totals.totalWithdrawals)}`,
    `*صافي الرصيد: ${money(totals.netBalance)}*`,
  );
  return lines.join('\n');
}
