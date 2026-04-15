import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Supplier } from '../models/supplier.model';
import { generateUUID } from '../../../shared/utils/uuid.util';
// import { ApiService } from '../../../core/services/api.service'; // فعّل عند ربط API

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  // private readonly api = inject(ApiService);

  getAll(): Observable<Supplier[]> {
    // استبدل بـ: return this.api.get<Supplier[]>('suppliers');
    return of([...MOCK_SUPPLIERS]).pipe(delay(200));
  }

  getById(id: string): Observable<Supplier> {
    const found = MOCK_SUPPLIERS.find((s) => s.id === id);
    return found
      ? of(found).pipe(delay(150))
      : throwError(() => new Error('المورد غير موجود'));
  }

  create(data: Omit<Supplier, 'id'>): Observable<Supplier> {
    const newSupplier: Supplier = { ...data, id: generateUUID() };
    MOCK_SUPPLIERS.unshift(newSupplier);
    return of(newSupplier).pipe(delay(400));
  }

  delete(id: string): Observable<void> {
    const idx = MOCK_SUPPLIERS.findIndex((s) => s.id === id);
    if (idx !== -1) MOCK_SUPPLIERS.splice(idx, 1);
    return of(undefined).pipe(delay(300));
  }
}

let MOCK_SUPPLIERS: Supplier[] = [
  { id: '1', name: 'شركة التقنية المتقدمة',    contactName: 'أحمد محمد', phone: '0112345678', email: 'tech@adv.sa',     city: 'الرياض', totalPurchases: 145000, balance: 12000, status: 'active',   lastOrderDate: '2025-03-15' },
  { id: '2', name: 'مؤسسة الإلكترونيات الحديثة', contactName: 'سعد العلي', phone: '0129876543', email: 'modern@elec.sa', city: 'جدة',    totalPurchases: 89000,  balance: 0,     status: 'active',   lastOrderDate: '2025-04-01' },
  { id: '3', name: 'مستودع الأجهزة المنزلية',  contactName: 'فيصل حمد', phone: '0133344556', email: 'home@app.sa',    city: 'الدمام', totalPurchases: 67000,  balance: 5500,  status: 'inactive', lastOrderDate: '2024-12-10' },
];
