import { PagedResponse } from '../../../core/models/api-response.model';

/** Single product/service line nested inside a `ClientContractRow`. */
export interface ClientContractRowItem {
  /** `null` for direct-contract items that are not linked to an inventory product. */
  productId: number | null;
  productName: string | null;
  quantity: number;
  purchasePrice: number;
}

/**
 * Wire shape of a single contract row returned by
 * `GET /dashboard/clients/{id}/contracts?PageIndex=&PageSize=`.
 *
 * A contract may carry MULTIPLE product/service lines — see `items`. The
 * top-level `quantity`/`purchasePrice` mirror the first item only (kept for
 * contracts that always have exactly one line); prefer `items` for anything
 * that must account for every line.
 */
export interface ClientContractRow {
  id: number;
  isDirectContract: boolean;
  /** Every product/service line on this contract — one or more. */
  items: ClientContractRowItem[];
  quantity: number;
  dateOfSale: string;
  purchasePrice: number;
  cashPrice: number;
  downPayment: number;
  profitRate: number;
  installmentsCount: number;
  installmentAmount: number;
  paymentFrequency: string;
  firstInstallmentDate: string;
  status: string;
  notes: string | null;
  createdAt: string;
  totalContractAmount: number;
  totalPaid: number;
  remainingAmount: number;
  treasuryId: number | null;
  representativeId: number | null;
  representativeName: string | null;
}

/**
 * Server-computed totals across ALL of the client's contracts (not just the
 * current page) — replaces the frontend-side summation that used to run
 * over the paginated rows.
 */
export interface ClientContractsSummary {
  totalContractsValue: number;
  totalRemaining: number;
  totalOverdue: number;
}

/**
 * Wire shape of `GET /dashboard/clients/{id}/contracts?PageIndex=&PageSize=`.
 * `data` nests both the client-wide `summary` and the paged `items`.
 */
export interface ClientContractsResponse {
  summary: ClientContractsSummary;
  items: PagedResponse<ClientContractRow>;
}

export interface ClientContractsQuery {
  pageIndex?: number;
  pageSize?: number;
  /** Partial, case-insensitive match against the contract's representative name. */
  representativeName?: string;
}

/** Single item line returned inside `ContractDetails`. */
export interface ContractDetailsItem {
  /** Item-line DB id — present when the API exposes it; `undefined` otherwise. */
  id?: number;
  productId: number | null;
  productName: string;
  warehouseId: number | null;
  warehouseName: string | null;
  quantity: number;
  purchasePrice: number;
}

/**
 * Wire shape of `GET /dashboard/contracts/{id}/details`.
 */
export interface ContractDetails {
  contract: ContractDetailsContract;
  /** All product/service lines on this contract (one or more). */
  items: ContractDetailsItem[];
  client: ContractDetailsClient;
  representative: ContractDetailsRepresentative | null;
  /** Only set for direct contracts that have a supplier attached. */
  supplier: ContractDetailsSupplier | null;
  summary: ContractDetailsSummary;
  nextInstallment: ContractNextInstallment | null;
  installments: ContractInstallmentRow[];
  payments: ContractPaymentRow[];
}

/** How much of one voucher was applied to one installment. */
export interface InstallmentAllocation {
  installmentId: number;
  sequence: number;
  amount: number;
}

export type ContractPaymentKind = 'Installment' | 'DownPayment';

/**
 * One row per receipt voucher (reversal vouchers are excluded server-side).
 * A single voucher may cover several installments — see `installments`.
 */
export interface ContractPaymentRow {
  /** Voucher id — the key for the edit/delete endpoints (never `voucherNumber`). */
  id: number;
  voucherNumber: string;
  date: string;
  amount: number;
  treasuryId: number | null;
  treasuryName: string | null;
  kind: ContractPaymentKind;
  notes: string | null;
  installments: InstallmentAllocation[];
  /** Always `false` for `DownPayment`. */
  canEdit: boolean;
  canDelete: boolean;
}

export interface ContractDetailsContract {
  id: number;
  isDirectContract: boolean;
  dateOfSale: string;
  cashPrice: number;
  downPayment: number;
  profitRate: number;
  installmentsCount: number;
  installmentAmount: number;
  paymentFrequency: string;
  firstInstallmentDate: string;
  status: string;
  notes: string | null;
  createdAt: string;
  representativeCommission: number;
  profitShareRate: number;
  treasuryId: number | null;
  /** Only present on direct contracts; `null` when no supplier is attached. */
  supplierId: number | null;
}

export interface ContractDetailsClient {
  id: number;
  fullName: string;
  phoneNumber: string;
  address: string;
}

/**
 * Supplier attached to a direct contract. `amountOwed` is informational —
 * the cost of the contract's items — and is not linked to any supplier
 * payment/settlement flow.
 */
export interface ContractDetailsSupplier {
  id: number;
  fullName: string;
  phoneNumber: string;
  amountOwed: number;
}

export interface ContractDetailsProduct {
  id: number;
  name: string;
}

export interface ContractDetailsWarehouse {
  id: number;
  name: string;
}

export interface ContractDetailsRepresentative {
  id: number;
  fullName: string;
  phoneNumber: string;
}

export interface ContractDetailsSummary {
  totalContractAmount: number;
  totalPaid: number;
  totalRemaining: number;
  overdueAmount: number;
  paidInstallmentsCount: number;
  totalInstallmentsCount: number;
  progressPercent: number;
}

export interface ContractNextInstallment {
  sequence: number;
  amount: number;
  dueDate: string;
}

/**
 * Installment status as sent on the wire — the numeric enum value
 * (`Upcoming=1, Due=2, Partial=3, Paid=4, Late=5`) or, on older payloads,
 * its name. Normalize with `toInstallmentStatus()` before using it.
 */
export type ContractInstallmentStatus = number | string;

/** The slice of one payment voucher applied to one installment. */
export interface InstallmentPart {
  voucherId: number;
  voucherNumber: string;
  date: string;
  /** Amount applied to THIS installment. */
  amount: number;
  /** Full voucher amount — greater than `amount` when it also covered other installments. */
  voucherTotal: number;
  treasuryId: number | null;
  treasuryName: string | null;
  notes: string | null;
}

export interface ContractInstallmentRow {
  id: number;
  sequence: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  remaining: number;
  paidDate: string | null;
  status: ContractInstallmentStatus;
  isOverdue: boolean;
  /** Payments applied to this installment, oldest first. */
  parts: InstallmentPart[];
}

/** POST /installments/pay */
export interface PayInstallmentPayload {
  contractId: number;
  amount: number;
  treasuryId: number;
  paymentDate: string;
  /** Optional — the backend no longer requires a payment method. */
  paymentMethod?: string;
  notes?: string;
}

/**
 * Result of `POST /installments/pay` and `PUT /dashboard/installments/payments/{id}`:
 * the single voucher recorded and how its amount was spread across installments.
 */
export interface InstallmentPaymentResult {
  voucherId: number;
  voucherNumber: string;
  amount: number;
  date: string;
  treasuryId: number;
  allocations: InstallmentAllocation[];
}

/** PUT /dashboard/installments/payments/{voucherId} — `null` keeps the current value. */
export interface UpdateInstallmentPaymentPayload {
  amount: number;
  treasuryId: number;
  paymentDate: string | null;
  notes: string | null;
}

