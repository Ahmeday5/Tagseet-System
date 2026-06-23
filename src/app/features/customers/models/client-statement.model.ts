import { PagedResponse } from '../../../core/models/api-response.model';

/**
 * Wire shape of a single contract row returned by
 * `GET /dashboard/clients/{id}/contracts?PageIndex=&PageSize=`.
 */
export interface ClientContractRow {
  id: number;
  isDirectContract: boolean;
  /** `null` for direct contracts that are not linked to an inventory product. */
  productId: number | null;
  productName: string;
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

export type ClientContractsPage = PagedResponse<ClientContractRow>;

export interface ClientContractsQuery {
  pageIndex?: number;
  pageSize?: number;
}

/**
 * Wire shape of `GET /dashboard/contracts/{id}/details`.
 */
export interface ContractDetails {
  contract: ContractDetailsContract;
  client: ContractDetailsClient;
  /** `null` for direct contracts that are not linked to a catalog product. */
  product: ContractDetailsProduct | null;
  warehouse: ContractDetailsWarehouse | null;
  representative: ContractDetailsRepresentative | null;
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
  /** Free-text product name for direct contracts (no catalog product). Null for regular contracts. */
  productName: string | null;
  isDirectContract: boolean;
  /** Populated by the API directly on the contract object (regular contracts). */
  productId: number | null;
  warehouseId: number | null;
  warehouseName: string | null;
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
  representativeCommission: number;
  profitShareRate: number;
  treasuryId: number | null;
}

export interface ContractDetailsClient {
  id: number;
  fullName: string;
  phoneNumber: string;
  address: string;
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
  name: string;
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

