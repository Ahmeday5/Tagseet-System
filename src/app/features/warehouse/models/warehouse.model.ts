export type StockAlertLevel = 'critical' | 'low' | 'ok';
export type AlertSeverity   = 'out' | 'critical' | 'low' | 'ok';

/**
 * Warehouse entity exactly as returned by `GET /dashboard/warehouses`.
 * No separate "view" DTO — the API shape *is* the view model.
 *
 * The four collection fields are returned as empty arrays today; typed as
 * optional unknown[] so they can be specialized later without breaking
 * existing call-sites.
 */
export interface Warehouse {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  inventoryBalances?: unknown[];
  inventoryTransactions?: unknown[];
  contracts?: unknown[];
  supplierPurchaseInvoices?: unknown[];
}

/** POST /dashboard/warehouses */
export interface CreateWarehousePayload {
  name: string;
  location: string;
  isActive: boolean;
}

/** PUT /dashboard/warehouses/{id} */
export interface UpdateWarehousePayload {
  name: string;
  location: string;
  isActive: boolean;
}

export interface WarehouseItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  alertLevel: StockAlertLevel;
  lastUpdated: string;
}

export interface InventoryAlert {
  id: string;
  name: string;
  severity: AlertSeverity;
  currentStock: number;
  minStock: number;
  warehouseInfo: string;
  supplierName?: string;
  lastSaleDate?: string;
  suggestedQty: number;
  canTransfer: boolean;
  transferSource?: string;
}

export interface WarehouseLocation {
  id: string;
  name: string;
  city: string;
  colorVar: string;
  purchased: number;
  sold: number;
  available: number;
  capacity: number;
  totalValue: number;
  profit: number;
}

export interface WarehouseDetailItem {
  id: string;
  warehouseId: string;
  name: string;
  sku: string;
  category: string;
  serialStart: string;
  serialEnd: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
}
