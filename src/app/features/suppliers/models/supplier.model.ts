export type SupplierStatus = 'active' | 'inactive';

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  totalPurchases: number;
  balance: number;
  status: SupplierStatus;
  lastOrderDate: string | null;
}
