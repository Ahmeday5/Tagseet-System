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
export type OrderStatus = 'pending' | 'converted' | 'rejected';

export interface PendingOrder {
  id: string;
  customerName: string;
  phone: string;
  productName: string;
  qty: number;
  requestDate: string;
  status: OrderStatus;
}
