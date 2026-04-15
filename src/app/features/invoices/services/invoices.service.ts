import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Invoice, InvoiceSupplier, InvoiceWarehouse } from '../models/invoice.model';
import { generateUUID } from '../../../shared/utils/uuid.util';

@Injectable({ providedIn: 'root' })
export class InvoicesService {

  getAll(): Observable<Invoice[]> {
    return of([...MOCK_INVOICES]).pipe(delay(250));
  }

  getById(id: string): Observable<Invoice> {
    const found = MOCK_INVOICES.find((i) => i.id === id);
    return found
      ? of(found).pipe(delay(150))
      : throwError(() => new Error('الفاتورة غير موجودة'));
  }

  create(invoice: Omit<Invoice, 'id'>): Observable<Invoice> {
    const newInvoice: Invoice = { ...invoice, id: generateUUID() };
    MOCK_INVOICES.unshift(newInvoice);
    return of(newInvoice).pipe(delay(400));
  }

  getSuppliers(): Observable<InvoiceSupplier[]> {
    return of(MOCK_SUPPLIERS).pipe(delay(100));
  }

  getWarehouses(): Observable<InvoiceWarehouse[]> {
    return of(MOCK_WAREHOUSES).pipe(delay(100));
  }
}

let MOCK_INVOICES: Invoice[] = [
  {
    id: '1', invoiceNumber: 'INV-2025-001', supplierName: 'شركة التقنية المتقدمة',
    date: '2025-03-15', dueDate: '2025-04-15', warehouseName: 'الرياض',
    paymentMethod: 'تحويل', itemsCount: 24,
    lines: [], subtotal: 12000, discountAmount: 600, vatAmount: 1710,
    total: 13110, paid: 13110, remaining: 0, status: 'paid',
  },
  {
    id: '2', invoiceNumber: 'INV-2025-002', supplierName: 'مؤسسة الإلكترونيات',
    date: '2025-04-01', dueDate: '2025-05-01', warehouseName: 'جدة',
    paymentMethod: 'آجل', itemsCount: 10,
    lines: [], subtotal: 8500, discountAmount: 0, vatAmount: 1275,
    total: 9775, paid: 5000, remaining: 4775, status: 'partial',
  },
  {
    id: '3', invoiceNumber: 'INV-2025-003', supplierName: 'مستودع الأجهزة',
    date: '2025-04-05', dueDate: '2025-05-05', warehouseName: 'الدمام',
    paymentMethod: 'آجل', itemsCount: 6,
    lines: [], subtotal: 4200, discountAmount: 200, vatAmount: 600,
    total: 4600, paid: 0, remaining: 4600, status: 'unpaid',
  },
];

const MOCK_SUPPLIERS: InvoiceSupplier[] = [
  { id: '1', name: 'شركة التقنية المتقدمة' },
  { id: '2', name: 'مؤسسة الإلكترونيات' },
  { id: '3', name: 'مستودع الأجهزة' },
  { id: '4', name: 'موزع سامسونج' },
  { id: '5', name: 'وكالة أبل الرسمية' },
];

const MOCK_WAREHOUSES: InvoiceWarehouse[] = [
  { id: '1', name: 'الرياض' },
  { id: '2', name: 'جدة' },
  { id: '3', name: 'الدمام' },
];
