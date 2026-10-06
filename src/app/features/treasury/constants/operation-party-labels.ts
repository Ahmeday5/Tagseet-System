import { BadgeType } from '../../../shared/components/badge/badge.component';
import { ApiError } from '../../../core/models/api-response.model';
import { OperationPartyType } from '../models/treasury.model';

export const OPERATION_PARTY_LABELS: Readonly<Record<OperationPartyType, string>> = {
  Customer: 'عميل',
  Supplier: 'مورد',
  Shareholder: 'مساهم',
  SubAccount: 'حساب فرعي',
  Representative: 'مندوب',
  Treasury: 'خزنة',
};

export const OPERATION_PARTY_BADGE: Readonly<Record<OperationPartyType, BadgeType>> = {
  Customer: 'info',
  Supplier: 'warn',
  Shareholder: 'purple',
  SubAccount: 'teal',
  Representative: 'pink',
  Treasury: 'ok',
};

/** Shown on edit/delete buttons of operations owned by another screen. */
export const OPERATION_LOCKED_HINT = 'هذه العملية تُعدَّل من شاشتها الأصلية';

/**
 * Arabic message for a failed operation edit/delete. 400 keeps the server's
 * (already translated) reason — e.g. insufficient balance.
 */
export function operationMutationError(err: ApiError): string {
  switch (err.status) {
    case 403:
      return 'ليس لديك صلاحية لتعديل هذه العملية';
    case 404:
      return 'العملية غير موجودة';
    default:
      return err.message;
  }
}
