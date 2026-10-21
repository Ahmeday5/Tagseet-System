import { BadgeType } from '../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../shared/pipes/currency-ar.pipe';
import {
  ContractInstallmentRow,
  ContractInstallmentStatus,
  InstallmentAllocation,
  InstallmentPart,
} from '../models/client-statement.model';

/** Backend installment status enum (numeric on the wire). */
export enum InstallmentStatus {
  Upcoming = 1,
  Due = 2,
  Partial = 3,
  Paid = 4,
  Late = 5,
}

interface StatusMeta {
  readonly label: string;
  readonly badge: BadgeType;
}

const STATUS_META: Record<InstallmentStatus, StatusMeta> = {
  [InstallmentStatus.Upcoming]: { label: 'قادم', badge: 'info' },
  [InstallmentStatus.Due]: { label: 'مستحق', badge: 'purple' },
  [InstallmentStatus.Partial]: { label: 'جزئي', badge: 'warn' },
  [InstallmentStatus.Paid]: { label: 'مسدد', badge: 'ok' },
  [InstallmentStatus.Late]: { label: 'متأخر', badge: 'bad' },
};

/** Legacy payloads send the enum name instead of its value. */
const STATUS_BY_NAME: Readonly<Record<string, InstallmentStatus>> = {
  Upcoming: InstallmentStatus.Upcoming,
  Due: InstallmentStatus.Due,
  Unpaid: InstallmentStatus.Due,
  Partial: InstallmentStatus.Partial,
  Paid: InstallmentStatus.Paid,
  Late: InstallmentStatus.Late,
  Overdue: InstallmentStatus.Late,
};

const currency = new CurrencyArPipe();

/** Same rendering as the `currencyAr` pipe, for text built in code (dialogs, prints). */
export function formatAmount(value: number): string {
  return currency.transform(value, true);
}

/**
 * Resolves the wire status (number or name) to the enum. An unpaid
 * installment flagged `isOverdue` is promoted to `Late` so the badge never
 * lags behind the backend's overdue flag.
 */
export function toInstallmentStatus(
  raw: ContractInstallmentStatus,
  isOverdue = false,
): InstallmentStatus {
  const status =
    typeof raw === 'number' && raw in STATUS_META
      ? (raw as InstallmentStatus)
      : (STATUS_BY_NAME[String(raw)] ?? InstallmentStatus.Upcoming);

  const isUnpaid =
    status === InstallmentStatus.Upcoming || status === InstallmentStatus.Due;
  return isOverdue && isUnpaid ? InstallmentStatus.Late : status;
}

export function installmentStatusLabel(status: InstallmentStatus): string {
  return STATUS_META[status].label;
}

export function installmentStatusBadge(status: InstallmentStatus): BadgeType {
  return STATUS_META[status].badge;
}

/**
 * One rendered line of the installments schedule. An installment with N
 * payment parts yields N lines (the first carries the row-spanned cells);
 * an installment with no payments yields a single line with `part = null`.
 */
export interface ScheduleLine {
  readonly key: string;
  readonly installment: ContractInstallmentRow;
  readonly part: InstallmentPart | null;
  /** First line of its installment group — renders the row-spanned cells. */
  readonly isGroupStart: boolean;
  readonly groupSize: number;
  readonly paid: number;
  readonly paidDate: string | null;
  /** Installment balance right after this line's payment. */
  readonly remainingAfter: number;
  readonly status: InstallmentStatus;
  /** The part's voucher also covered other installments. */
  readonly isSharedVoucher: boolean;
}

/** Avoid binary-float noise (e.g. 0.30000000000000004) in running balances. */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Flattens installments into schedule lines, one per payment part, with the
 * running remaining balance and per-part status (Partial until the part that
 * settles the installment, which is Paid).
 */
export function buildScheduleLines(
  installments: readonly ContractInstallmentRow[],
): ScheduleLine[] {
  return [...installments]
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((installment) => {
      const parts = installment.parts ?? [];
      const installmentStatus = toInstallmentStatus(
        installment.status,
        installment.isOverdue,
      );

      if (parts.length === 0) {
        return [
          {
            key: `${installment.id}`,
            installment,
            part: null,
            isGroupStart: true,
            groupSize: 1,
            paid: installment.paidAmount,
            paidDate: installment.paidDate,
            remainingAfter: installment.remaining,
            status: installmentStatus,
            isSharedVoucher: false,
          } satisfies ScheduleLine,
        ];
      }

      let paidSoFar = 0;
      return parts.map((part, index): ScheduleLine => {
        paidSoFar = roundMoney(paidSoFar + part.amount);
        const remainingAfter = Math.max(
          0,
          roundMoney(installment.dueAmount - paidSoFar),
        );
        return {
          key: `${installment.id}-${part.voucherId}-${index}`,
          installment,
          part,
          isGroupStart: index === 0,
          groupSize: parts.length,
          paid: part.amount,
          paidDate: part.date,
          remainingAfter,
          status:
            remainingAfter <= 0
              ? InstallmentStatus.Paid
              : InstallmentStatus.Partial,
          isSharedVoucher: part.voucherTotal > part.amount,
        };
      });
    });
}

/**
 * "قسط 3: 300، قسط 4: 1000 (جزئي)" — the partial marker is added when the
 * allocation is below the installment's due amount (needs `installments`).
 */
export function allocationLabel(
  allocation: InstallmentAllocation,
  installments: readonly ContractInstallmentRow[] = [],
): string {
  const installment = installments.find(
    (it) => it.id === allocation.installmentId,
  );
  const isPartial = !!installment && allocation.amount < installment.dueAmount;
  return `قسط ${allocation.sequence}: ${formatAmount(allocation.amount)}${isPartial ? ' (جزئي)' : ''}`;
}

export function describeAllocations(
  allocations: readonly InstallmentAllocation[],
  installments: readonly ContractInstallmentRow[] = [],
): string {
  return allocations.map((a) => allocationLabel(a, installments)).join('، ');
}
