import { PagedResponse } from '../../../core/models/api-response.model';

/**
 * Supplier as it comes back from the backend. The list endpoint returns
 * the full shape (with purchasing aggregates); the create/update/getById
 * endpoints return only the contact essentials. Aggregate fields are
 * therefore optional so a single interface covers both shapes.
 */
export interface Supplier {
  id: number;
  fullName: string;
  address: string;
  phoneNumber: string;

  // ── server-computed aggregates (list endpoint only) ──
  /** Most-purchased item or short summary of supplied goods. */
  goods?: string | null;
  /** Total units purchased from this supplier across all invoices. */
  quantity?: number;
  /** Average unit price weighted across all invoices. */
  unitPrice?: number;
  /** Sum of all invoice totals for this supplier. */
  totalAmount?: number;
  /** Sum of all amounts paid to this supplier. */
  paidAmount?: number;
  /** Outstanding balance owed to this supplier. */
  remainingAmount?: number;
  /** ISO datetime of the most recent purchase invoice (or `null`). */
  lastSupplyDate?: string | null;
}

/** POST /dashboard/suppliers — only the contact essentials are writable. */
export interface CreateSupplierPayload {
  fullName: string;
  address: string;
  phoneNumber: string;
}

/** PUT /dashboard/suppliers/{id} — same fields as create. */
export type UpdateSupplierPayload = CreateSupplierPayload;

/**
 * Aggregate purchase totals returned alongside the supplier list. They
 * reflect the full filtered set, not just the current page.
 */
export interface SuppliersSummary {
  totalPurchases: number;
  totalPaid: number;
  totalRemaining: number;
}

/**
 * Wire shape for `GET /dashboard/suppliers` after the standard envelope
 * is unwrapped — `summary` next to a paged `items` envelope.
 */
export interface SuppliersListResponse {
  summary: SuppliersSummary;
  items: PagedResponse<Supplier>;
}
