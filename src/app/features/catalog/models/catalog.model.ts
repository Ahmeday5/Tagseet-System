/**
 * Local catalog product (still mock-backed). Distinct from the warehouse
 * Product entity — only the catalog page reads it today.
 */
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  sku: string;
  warehouseName?: string;
  serialStart?: string;
  serialEnd?: string;
  serialLabel?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface InstallmentCalculation {
  cashPrice: number;
  downPayment: number;
  profitAmount: number;
  totalAmount: number;
  installmentAmount: number;
  installmentsCount: number;
  period: string;
}

export type InstallmentPeriod = 'شهري' | 'أسبوعي' | 'ربع سنوي' | 'نصف سنوي';

// ─────────────────────────────────────────────────────────────────
//  Client orders coming from the customer-app
//  GET /dashboard/client-orders
// ─────────────────────────────────────────────────────────────────

export type ClientOrderStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Converted'
  | 'Cancelled';

export type PaymentMethod = 'Cash' | 'Installments';

export interface ClientOrderItem {
  productName: string;
  quantity: number;
  price: number;
}

/** Exact shape returned by the backend. */
export interface ClientOrder {
  id: number;
  clientName: string;
  clientPhone: string;
  orderDate: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  downPayment: number;
  installmentsCount: number;
  installmentAmount: number;
  status: ClientOrderStatus;
  items: ClientOrderItem[];
}

/** POST /dashboard/client-orders/{id}/convert-to-contract */
export interface ConvertToContractPayload {
  warehouseId: number;
  treasuryId: number;
  /** ISO 8601 string. */
  purchaseDate: string;
  /** ISO 8601 string. */
  firstInstallmentDate: string;
  notes: string;
}
