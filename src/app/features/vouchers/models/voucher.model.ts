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

/**
 * Full voucher record returned by `GET /dashboard/vouchers/{id}`.
 * Extends the list DTO with the IDs needed to pre-populate the edit form.
 */
export interface VoucherDetailDto {
  id: number;
  voucherNumber: string;
  type: VoucherType;
  amount: number;
  date: string;
  treasuryId: number;
  treasuryName: string;
  relatedPartyType: RelatedPartyType;
  relatedPartyId: number | null;
  relatedPartyName: string | null;
  referenceType: ReferenceType;
  referenceId: number | null;
  installmentId: number | null;
  notes: string;
}

/**
 * POST /dashboard/vouchers body.
 *
 * `relatedPartyId` is `null` when `relatedPartyType` is `Other` (no entity
 * to link). `date` is a calendar date (`yyyy-MM-dd`), not a timestamp.
 */
export interface CreateVoucherPayload {
  type: VoucherType;
  amount: number;
  treasuryId: number;
  date: string;
  relatedPartyType: RelatedPartyType;
  relatedPartyId: number | null;
  notes: string;
}

/** Query parameters supported by `GET /dashboard/vouchers`. */
export interface VouchersQuery {
  pageIndex?: number;
  pageSize?: number;
  type?: VoucherType | '';
  referenceType?: ReferenceType | '';
  relatedPartyType?: RelatedPartyType | '';
  /** Free-text search over the related-party name. */
  search?: string;
}

/** PUT /dashboard/vouchers/{id} body. */
export interface UpdateVoucherPayload {
  amount: number;
  treasuryId: number;
  date: string;
  relatedPartyType: RelatedPartyType;
  relatedPartyId: number;
  notes: string;
}
