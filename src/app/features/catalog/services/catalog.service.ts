import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { PendingOrder, Product } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {

  getAll(): Observable<Product[]> {
    return of([...MOCK_PRODUCTS]).pipe(delay(200));
  }

  getById(id: string): Observable<Product> {
    const found = MOCK_PRODUCTS.find((p) => p.id === id);
    return found
      ? of(found).pipe(delay(150))
      : throwError(() => new Error('المنتج غير موجود'));
  }

  updateStock(id: string, delta: number): Observable<Product> {
    const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
    if (idx === -1) return throwError(() => new Error('المنتج غير موجود'));
    MOCK_PRODUCTS[idx] = { ...MOCK_PRODUCTS[idx], stock: MOCK_PRODUCTS[idx].stock + delta };
    return of(MOCK_PRODUCTS[idx]).pipe(delay(200));
  }

  getPendingOrders(): Observable<PendingOrder[]> {
    return of(MOCK_PENDING_ORDERS.filter(o => o.status === 'pending')).pipe(delay(200));
  }

  convertToContract(id: string): Observable<void> {
    const idx = MOCK_PENDING_ORDERS.findIndex(o => o.id === id);
    if (idx !== -1) MOCK_PENDING_ORDERS[idx] = { ...MOCK_PENDING_ORDERS[idx], status: 'converted' };
    return of(undefined).pipe(delay(300));
  }

  rejectOrder(id: string): Observable<void> {
    const idx = MOCK_PENDING_ORDERS.findIndex(o => o.id === id);
    if (idx !== -1) MOCK_PENDING_ORDERS[idx] = { ...MOCK_PENDING_ORDERS[idx], status: 'rejected' };
    return of(undefined).pipe(delay(200));
  }
}

let MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Samsung Galaxy S25',  category: 'هواتف', price: 800,  costPrice: 600,  stock: 15, minStock: 3, sku: 'SAM-S25',  warehouseName: 'الرياض', serialStart: 'SAM001', serialEnd: 'SAM015' },
  { id: '2', name: 'iPhone 15 Pro',       category: 'هواتف', price: 1800, costPrice: 1400, stock: 8,  minStock: 2, sku: 'APL-15P',  warehouseName: 'الرياض', serialStart: 'APL001', serialEnd: 'APL008' },
  { id: '3', name: 'Dell XPS 15',         category: 'حاسب',  price: 2500, costPrice: 2000, stock: 4,  minStock: 2, sku: 'DEL-XPS',  warehouseName: 'جدة',    serialStart: 'DEL001', serialEnd: 'DEL004' },
  { id: '4', name: 'ثلاجة LG 18 قدم',   category: 'أجهزة', price: 900,  costPrice: 700,  stock: 6,  minStock: 2, sku: 'LG-RF18',  warehouseName: 'الدمام', serialStart: 'LG001',  serialEnd: 'LG006'  },
  { id: '5', name: 'تلفاز Samsung 55"',  category: 'أجهزة', price: 1200, costPrice: 900,  stock: 3,  minStock: 2, sku: 'SAM-TV55', warehouseName: 'جدة',    serialStart: 'TV001',  serialEnd: 'TV003'  },
];

let MOCK_PENDING_ORDERS: PendingOrder[] = [
  { id: '1', customerName: 'خالد محمد',   phone: '0501111111', productName: 'iPhone 15 Pro',      qty: 1, requestDate: '2025-04-10', status: 'pending' },
  { id: '2', customerName: 'سارة أحمد',   phone: '0502222222', productName: 'Samsung Galaxy S25', qty: 2, requestDate: '2025-04-11', status: 'pending' },
  { id: '3', customerName: 'عمر العتيبي', phone: '0503333333', productName: 'Dell XPS 15',        qty: 1, requestDate: '2025-04-12', status: 'pending' },
];
