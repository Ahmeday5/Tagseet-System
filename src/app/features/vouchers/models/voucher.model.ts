import {
  ReferenceType,
  RelatedPartyType,
  VoucherType,
} from '../enums/voucher.enums';

/**
 * Raw shape of a single row returned by `GET /dashboard/vouchers`.
 *
 * The backend serializes its underlying numeric enums as their string names,
 * so we mirror that on the client — see `voucher.enums.ts`.
 */
export interface VoucherDto {
  id: number;
  voucherNumber: string;
  type: VoucherType;
  amount: number;
  /** ISO timestamp (sometimes date-only, e.g. `2026-07-03T00:00:00`). */
  date: string;
  treasuryName: string;
  relatedPartyType: RelatedPartyType;
  relatedPartyName: string;
  referenceType: ReferenceType;
  notes: string | null;
}

/** Query parameters supported by `GET /dashboard/vouchers`. */
export interface VouchersQuery {
  pageIndex?: number;
  pageSize?: number;
  type?: VoucherType | '';
  referenceType?: ReferenceType | '';
  relatedPartyType?: RelatedPartyType | '';
}
