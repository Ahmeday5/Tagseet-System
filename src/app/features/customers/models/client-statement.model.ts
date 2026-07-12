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

export interface ContractPaymentRow {
  /** Voucher DB id — present when the API exposes it; `undefined` otherwise. */
  id?: number;
  voucherNumber: string;
  date: string;
  amount: number;
  kind: string;
  notes: string | null;
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

export type ContractInstallmentStatus =
  | 'Paid'
  | 'Partial'
  | 'Upcoming'
  | 'Overdue'
  | string;

export interface ContractInstallmentRow {
  /** Installment's own DB id — present when the API exposes it; `undefined` otherwise. */
  id?: number;
  sequence: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  remaining: number;
  paidDate: string | null;
  status: ContractInstallmentStatus;
  isOverdue: boolean;
  notes: string | null;
}

/** POST /installments/pay */
export interface PayInstallmentPayload {
  contractId: number;
  amount: number;
  treasuryId: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

export interface PayInstallmentResponse {
  message: string;
}

/** POST /installments/{id}/cancel-payment */
export interface CancelInstallmentPaymentResponse {
  message: string;
}

