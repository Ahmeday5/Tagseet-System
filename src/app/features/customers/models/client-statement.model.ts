import { PagedResponse } from '../../../core/models/api-response.model';

/**
 * Wire shape of a single contract row returned by
 * `GET /dashboard/clients/{id}/contracts?PageIndex=&PageSize=`.
 */
export interface ClientContractRow {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  purchaseDate: string;
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
  product: ContractDetailsProduct;
  warehouse: ContractDetailsWarehouse | null;
  representative: ContractDetailsRepresentative | null;
  summary: ContractDetailsSummary;
  nextInstallment: ContractNextInstallment | null;
  installments: ContractInstallmentRow[];
}

export interface ContractDetailsContract {
  id: number;
  quantity: number;
  purchaseDate: string;
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
  sequence: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  remaining: number;
  paidDate: string | null;
  status: ContractInstallmentStatus;
  isOverdue: boolean;
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
