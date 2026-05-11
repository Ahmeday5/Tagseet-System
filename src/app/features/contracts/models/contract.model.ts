export interface Contract {
  id: string;
  customerName: string;
  nationalId: string;
  phone: string;
  address: string;
  contractDate: string;
  productDesc: string;
  serialNumber: string;
  costPrice: number;
  cashPrice: number;
  downPayment: number;
  profitRate: number;
  profitAmount: number;
  totalAmount: number;
  installmentAmount: number;
  installmentsCount: number;
  period: string;
  firstInstallmentDate: string;
  repName: string;
  witnessName: string;
  notes: string;
}

export interface ContractFormData {
  customerId: string;
  productDesc: string;
  cashPrice: number;
  downPayment: number;
  profitRate: number;
  installmentsCount: number;
  period: string;
  witnessName: string;
}

// ─────────────────────────────────────────────────────────────────
//  Live API: POST /dashboard/contracts
//  Direct installment-contract creation (separate from the
//  client-order conversion flow).
// ─────────────────────────────────────────────────────────────────

export type ContractPaymentFrequency = 'Monthly' | 'Weekly' | 'Daily' | 'Yearly';

export type ContractStatus =
  | 'Active'
  | 'Completed'
  | 'Defaulted'
  | 'Cancelled';

/**
 * Payload for `POST /dashboard/contracts`.
 *
 *   IMPORTANT — `representativeId` is OPTIONAL:
 *   - When the user attached a representative, send the id.
 *   - When the user didn't, OMIT the field entirely from the JSON
 *     body. Sending `0` or `null` makes the backend try to attach a
 *     non-existent rep and fail.
 *
 * Use `buildCreateContractPayload()` to assemble the body — it strips
 * `representativeId` when missing/zero so call sites can keep a single
 * form-state shape regardless of whether a rep is selected.
 */
export interface CreateContractPayload {
  clientId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  /** ISO datetime — e.g. `2026-05-11T08:19:34.462Z`. */
  purchaseDate: string;
  purchasePrice: number;
  cashPrice: number;
  downPayment: number;
  /** 0..100. */
  profitRate: number;
  installmentsCount: number;
  installmentAmount: number;
  paymentFrequency: ContractPaymentFrequency;
  /** ISO datetime — first installment due date. */
  firstInstallmentDate: string;
  treasuryId: number;
  /** Omit when no representative is attached — do NOT send 0 or null. */
  representativeId?: number;
  notes?: string;
}

/** Response shape from `POST /dashboard/contracts`. */
export interface CreatedContract {
  id: number;
  clientId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  purchaseDate: string;
  purchasePrice: number;
  cashPrice: number;
  downPayment: number;
  profitRate: number;
  installmentsCount: number;
  installmentAmount: number;
  paymentFrequency: ContractPaymentFrequency;
  firstInstallmentDate: string;
  status: ContractStatus;
  /** May be `null` when no rep was attached. */
  representativeId: number | null;
  representativeCommission: number;
  notes: string | null;
}

/**
 * Form-state shape consumed by the contract creation UI. Mirrors the
 * payload but keeps `representativeId` typed as `number | null` so the
 * select control can bind to it directly; the payload builder takes
 * care of stripping the field when it's nullish or zero.
 */
export interface ContractFormState {
  clientId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  purchaseDate: string;
  purchasePrice: number;
  cashPrice: number;
  downPayment: number;
  profitRate: number;
  installmentsCount: number;
  installmentAmount: number;
  paymentFrequency: ContractPaymentFrequency;
  firstInstallmentDate: string;
  treasuryId: number;
  representativeId: number | null;
  notes?: string;
}

/**
 * Build a `POST /dashboard/contracts` body from form state.
 *
 * - Trims `notes` and drops the field when empty.
 * - OMITS `representativeId` entirely when the form has no rep
 *   selected (`null`, `undefined`, or `0`) — never sends `0`/`null`.
 *
 * Returning a fresh object also keeps the form state immutable.
 */
export function buildCreateContractPayload(
  form: ContractFormState,
): CreateContractPayload {
  const payload: CreateContractPayload = {
    clientId: form.clientId,
    productId: form.productId,
    warehouseId: form.warehouseId,
    quantity: form.quantity,
    purchaseDate: form.purchaseDate,
    purchasePrice: form.purchasePrice,
    cashPrice: form.cashPrice,
    downPayment: form.downPayment,
    profitRate: form.profitRate,
    installmentsCount: form.installmentsCount,
    installmentAmount: form.installmentAmount,
    paymentFrequency: form.paymentFrequency,
    firstInstallmentDate: form.firstInstallmentDate,
    treasuryId: form.treasuryId,
  };

  // Omit — DO NOT send 0/null — when no rep is attached.
  if (form.representativeId && form.representativeId > 0) {
    payload.representativeId = form.representativeId;
  }

  const trimmedNotes = form.notes?.trim();
  if (trimmedNotes) payload.notes = trimmedNotes;

  return payload;
}
