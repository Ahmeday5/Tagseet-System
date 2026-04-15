export type InvoiceStatus = 'paid' | 'partial' | 'unpaid';
export type InvoicePaymentMethod = 'نقدي' | 'تحويل' | 'مدى' | 'STC Pay' | 'آجل';

export interface InvoiceSupplier { id: string; name: string; }
export interface InvoiceWarehouse { id: string; name: string; }

export interface InvoiceLine {
  productName: string;
  qty: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface InvoiceLineForm {
  productName: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  date: string;
  dueDate?: string;
  warehouseName?: string;
  paymentMethod?: InvoicePaymentMethod;
  lines: InvoiceLine[];
  itemsCount: number;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  paid: number;
  remaining: number;
  status: InvoiceStatus;
  notes?: string;
}
