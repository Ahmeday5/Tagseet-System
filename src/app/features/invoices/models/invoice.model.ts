/**
 * Models for `/dashboard/supplier-purchase-invoices`.
 *
 * Fields mirror the backend exactly — the page never mutates them, so
 * keeping the names in sync with the API spares us a translation layer
 * and keeps the network shape obvious from any consumer site.
 */

export type PurchaseInvoiceStatus =
  | 'Draft'
  | 'Pending'
  | 'PartiallyPaid'
  | 'Paid'
  | 'Confirmed'
  | 'Cancelled';

// ─────────────────────────────────────────────────────────────────
//  Summary card on the list page
//  GET /dashboard/supplier-purchase-invoices/summary
// ─────────────────────────────────────────────────────────────────

export interface PurchaseInvoiceSummary {
  totalPurchases: number;
  totalPaid: number;
  totalOutstanding: number;
  invoicesThisMonth: number;
}

// ─────────────────────────────────────────────────────────────────
//  Lite shape for the list table (subset of the full invoice)
//  GET /dashboard/supplier-purchase-invoices?search=&status=&supplierId=
// ─────────────────────────────────────────────────────────────────

export interface PurchaseInvoiceListItem {
  id: number;
  invoiceNumber: string;
  supplierName: string;
  itemsSummary: string;
  quantity: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  invoiceDate: string;
  status: PurchaseInvoiceStatus;
  /** True for invoices created via the free-text "direct" flow (no warehouse). */
  isDirect: boolean;
}

export interface PurchaseInvoiceFilters {
  search?: string;
  status?: PurchaseInvoiceStatus | '';
  supplierId?: number | '';
  pageIndex?: number;
  pageSize?: number;
}

// ─────────────────────────────────────────────────────────────────
//  Full invoice (read + write)
// ─────────────────────────────────────────────────────────────────

export interface PurchaseInvoiceItem {
  /** `null` for a direct invoice's free-text line (see `productName`). */
  productId: number | null;
  productName?: string;
  quantity: number;
  unitPrice: number;
  /** Flat currency amount for the whole line — NOT a percentage. */
  discountAmount: number;
  /** Optional free-text note for this line, up to 1000 chars. */
  notes?: string | null;
  /** Server-computed; only present in responses. */
  lineTotal?: number;
}

export interface PurchaseInvoice {
  id: number;
  invoiceNumber: string;
  supplierId: number;
  supplierName: string;
  /** `null` for a direct invoice — it isn't tied to any warehouse. */
  warehouseId: number | null;
  /** Empty string for a direct invoice. */
  warehouseName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  treasuryId: number | null;
  status: PurchaseInvoiceStatus;
  notes: string;
  items: PurchaseInvoiceItem[];
  /**
   * True when this invoice was created via the free-text "direct" flow
   * (`POST/PUT .../direct`) — no warehouse, no draft/confirm step, items
   * carry `productName` instead of a `productId`. Edits must branch on this
   * flag: sending a regular `PUT .../{id}` to a direct invoice (or the
   * direct `PUT .../{id}/direct` to a warehouse-linked one) is rejected
   * with a 400 by the server.
   */
  isDirect: boolean;
}

/** POST /dashboard/supplier-purchase-invoices */
export interface CreatePurchaseInvoicePayload {
  supplierId: number;
  warehouseId: number;
  /** ISO 8601 string (UTC). */
  invoiceDate: string;
  /** ISO 8601 string (UTC). */
  dueDate: string;
  /** Whole number percentage, e.g. `15` for 15% VAT. */
  taxRatePercent: number;
  paidAmount: number;
  treasuryId: number | null;
  /** Backend default is `true` — the form must opt out explicitly. */
  isDraft: boolean;
  /** Skip stock auto-posting on draft saves. */
  autoPostInventory: boolean;
  notes: string;
  items: CreatePurchaseInvoiceItem[];
}

export interface CreatePurchaseInvoiceItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  /** Flat currency amount for the whole line — must be between 0 and quantity*unitPrice. */
  discountAmount: number;
  /** Optional free-text note for this line, up to 1000 chars. */
  notes?: string | null;
}

/**
 * PUT /dashboard/supplier-purchase-invoices/{id}. The backend accepts the
 * exact same body as create, so the type is shared rather than duplicated.
 */
export type UpdatePurchaseInvoicePayload = CreatePurchaseInvoicePayload;

// ─────────────────────────────────────────────────────────────────
//  Direct invoice — POST/PUT .../supplier-purchase-invoices/direct
//  No warehouse, no draft/confirm, free-text `productName` line items.
// ─────────────────────────────────────────────────────────────────

export interface DirectPurchaseInvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  /** Flat currency amount for the whole line — must be between 0 and quantity*unitPrice. */
  discountAmount: number;
  /** Optional free-text note for this line, up to 1000 chars. */
  notes?: string | null;
}

/** POST /dashboard/supplier-purchase-invoices/direct */
export interface CreateDirectPurchaseInvoicePayload {
  supplierId: number;
  /** ISO 8601 string (UTC). Optional — server defaults to now. */
  invoiceDate?: string;
  /** ISO 8601 string (UTC). Optional. */
  dueDate?: string | null;
  /** Whole number percentage, e.g. `15` for 15% VAT. Optional — server defaults to 0. */
  taxRatePercent?: number;
  /** Optional — server defaults to 0. `treasuryId` is required whenever this is > 0. */
  paidAmount?: number;
  treasuryId?: number | null;
  notes?: string | null;
  items: DirectPurchaseInvoiceItem[];
}

/**
 * PUT /dashboard/supplier-purchase-invoices/{id}/direct. Same body shape as
 * create; the server rejects it with 400 if the target invoice isn't
 * `isDirect`.
 */
export type UpdateDirectPurchaseInvoicePayload = CreateDirectPurchaseInvoicePayload;

/** POST /dashboard/supplier-purchase-invoices/{id}/confirm */
export interface ConfirmPurchaseInvoicePayload {
  treasuryId: number;
}

/** POST /dashboard/supplier-purchase-invoices/{id}/payments */
export interface PayInvoicePayload {
  treasuryId: number;
  amount: number;
  /** `yyyy-MM-dd` — calendar date, not a timestamp. */
  paymentDate: string;
  notes: string;
}

// ─────────────────────────────────────────────────────────────────
//  Display helpers
// ─────────────────────────────────────────────────────────────────

export interface PurchaseInvoiceStatusView {
  label: string;
  /** Matches the global `.b.b{ok|warn|bad|info}` palette. */
  variant: 'ok' | 'warn' | 'bad' | 'info';
}

export const PURCHASE_INVOICE_STATUS_VIEW: Record<
  PurchaseInvoiceStatus,
  PurchaseInvoiceStatusView
> = {
  Draft:         { label: 'مسودة',     variant: 'info' },
  Pending:       { label: 'بانتظار الدفع', variant: 'warn' },
  PartiallyPaid: { label: 'جزئية',     variant: 'warn' },
  Paid:          { label: 'مسددة',     variant: 'ok'   },
  Confirmed:     { label: 'مؤكدة',     variant: 'ok'   },
  Cancelled:     { label: 'ملغية',     variant: 'bad'  },
};

