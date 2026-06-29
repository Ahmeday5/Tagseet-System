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

/**
 * Backend `PaymentFrequency` enum (Monthly = 1, Quarterly = 3, SemiAnnual = 4).
 * Sent/received by name. Daily/Weekly/Yearly are no longer supported.
 */
export type ContractPaymentFrequency = 'Monthly' | 'Quarterly' | 'SemiAnnual';

export type ContractStatus =
  | 'Active'
  | 'Completed'
  | 'Defaulted'
  | 'Cancelled';

/** Single item line in a regular (inventory-linked) contract. */
export interface ContractItem {
  productId: number;
  warehouseId: number;
  quantity: number;
}

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
  items: ContractItem[];
  /** ISO datetime (date of sale) — e.g. `2026-05-11T08:19:34.462Z`. */
  dateOfSale: string;
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
  dateOfSale: string;
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
 * Form-state shape consumed by the contract creation UI.
 * `representativeId` stays typed as `number | null` so the select
 * control can bind directly; the payload builder strips it when nullish.
 */
export interface ContractFormState {
  clientId: number;
  items: ContractItem[];
  dateOfSale: string;
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

// ─────────────────────────────────────────────────────────────────
//  Live API: POST /dashboard/contracts/direct
//  Direct contract — free-text product name, no warehouse/inventory.
// ─────────────────────────────────────────────────────────────────

/** Single item line in a direct (free-text) contract. */
export interface DirectContractItem {
  productName: string;
  purchasePrice: number;
  quantity: number;
}

/**
 * Payload for `POST /dashboard/contracts/direct`.
 *
 * Uses `items[]` (like the regular contract) except each item carries
 * a free-text `productName` and `purchasePrice` instead of `productId`/`warehouseId`.
 */
export interface CreateDirectContractPayload {
  clientId: number;
  items: DirectContractItem[];
  /** ISO datetime. */
  dateOfSale: string;
  cashPrice: number;
  downPayment: number;
  /** 0..100. */
  profitRate: number;
  installmentsCount: number;
  installmentAmount: number;
  paymentFrequency: ContractPaymentFrequency;
  /** ISO datetime. */
  firstInstallmentDate: string;
  treasuryId: number;
  /** Omit when no representative — do NOT send 0 or null. */
  representativeId?: number;
  notes?: string;
}

/** Response shape from `POST /dashboard/contracts/direct`. */
export interface CreatedDirectContract {
  id: number;
  clientId: number;
  dateOfSale: string;
  cashPrice: number;
  downPayment: number;
  profitRate: number;
  installmentsCount: number;
  installmentAmount: number;
  paymentFrequency: ContractPaymentFrequency;
  firstInstallmentDate: string;
  status: ContractStatus;
  representativeId: number | null;
  representativeCommission: number;
  notes: string | null;
}

/**
 * Build a `POST /dashboard/contracts/direct` body from raw form values.
 * Wraps item fields into `items[]`, strips `representativeId` when null/zero.
 */
export function buildDirectContractPayload(
  form: CreateDirectContractPayload,
): CreateDirectContractPayload {
  const payload: CreateDirectContractPayload = {
    clientId: form.clientId,
    items: form.items.map((item) => ({
      productName: item.productName.trim(),
      purchasePrice: item.purchasePrice,
      quantity: item.quantity,
    })),
    dateOfSale: form.dateOfSale,
    cashPrice: form.cashPrice,
    downPayment: form.downPayment,
    profitRate: form.profitRate,
    installmentsCount: form.installmentsCount,
    installmentAmount: form.installmentAmount,
    paymentFrequency: form.paymentFrequency,
    firstInstallmentDate: form.firstInstallmentDate,
    treasuryId: form.treasuryId,
  };

  if (form.representativeId && form.representativeId > 0) {
    payload.representativeId = form.representativeId;
  }

  const trimmedNotes = form.notes?.trim();
  if (trimmedNotes) payload.notes = trimmedNotes;

  return payload;
}

// ─────────────────────────────────────────────────────────────────
//  Live API: PUT /dashboard/contracts/{id}
// ─────────────────────────────────────────────────────────────────

/**
 * Payload for `PUT /dashboard/contracts/{id}`.
 *
 * Same structure as `CreateContractPayload` (items array) except
 * `purchasePrice` is NOT sent — it is immutable after creation.
 *
 * Same rule as create: OMIT `representativeId` when not selected.
 * Use `buildUpdateContractPayload()` to assemble the body safely.
 */
export interface UpdateContractPayload {
  clientId: number;
  items: ContractItem[];
  dateOfSale: string;
  cashPrice: number;
  downPayment: number;
  profitRate: number;
  installmentsCount: number;
  installmentAmount: number;
  paymentFrequency: ContractPaymentFrequency;
  firstInstallmentDate: string;
  treasuryId: number;
  representativeId?: number;
  notes?: string;
}

/** Form-state shape for the edit page. */
export interface UpdateContractFormState {
  clientId: number;
  items: ContractItem[];
  dateOfSale: string;
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

/** Build a `PUT /dashboard/contracts/{id}` body. */
export function buildUpdateContractPayload(
  form: UpdateContractFormState,
): UpdateContractPayload {
  const payload: UpdateContractPayload = {
    clientId: form.clientId,
    items: form.items,
    dateOfSale: form.dateOfSale,
    cashPrice: form.cashPrice,
    downPayment: form.downPayment,
    profitRate: form.profitRate,
    installmentsCount: form.installmentsCount,
    installmentAmount: form.installmentAmount,
    paymentFrequency: form.paymentFrequency,
    firstInstallmentDate: form.firstInstallmentDate,
    treasuryId: form.treasuryId,
  };

  if (form.representativeId && form.representativeId > 0) {
    payload.representativeId = form.representativeId;
  }

  const trimmedNotes = form.notes?.trim();
  if (trimmedNotes) payload.notes = trimmedNotes;

  return payload;
}

/** Build a `POST /dashboard/contracts` body from form state. */
export function buildCreateContractPayload(
  form: ContractFormState,
): CreateContractPayload {
  const payload: CreateContractPayload = {
    clientId: form.clientId,
    items: form.items,
    dateOfSale: form.dateOfSale,
    cashPrice: form.cashPrice,
    downPayment: form.downPayment,
    profitRate: form.profitRate,
    installmentsCount: form.installmentsCount,
    installmentAmount: form.installmentAmount,
    paymentFrequency: form.paymentFrequency,
    firstInstallmentDate: form.firstInstallmentDate,
    treasuryId: form.treasuryId,
  };

  if (form.representativeId && form.representativeId > 0) {
    payload.representativeId = form.representativeId;
  }

  const trimmedNotes = form.notes?.trim();
  if (trimmedNotes) payload.notes = trimmedNotes;

  return payload;
}
