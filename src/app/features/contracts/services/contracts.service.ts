import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Contract } from '../models/contract.model';

@Injectable({ providedIn: 'root' })
export class ContractsService {

  getAll(): Observable<Contract[]> {
    return of([...MOCK_CONTRACTS]).pipe(delay(250));
  }

  getById(id: string): Observable<Contract | undefined> {
    return of(MOCK_CONTRACTS.find((c) => c.id === id)).pipe(delay(150));
  }

  create(contract: Omit<Contract, 'id'>): Observable<Contract> {
    const newContract: Contract = { ...contract, id: `TQ-${Date.now()}` };
    MOCK_CONTRACTS.unshift(newContract);
    return of(newContract).pipe(delay(400));
  }
}

let MOCK_CONTRACTS: Contract[] = [
  {
    id: '#2025-148',
    customerName: 'خالد عبدالله العمري',
    nationalId: '1082345678',
    phone: '0501234567',
    address: 'الرياض، حي النرجس',
    contractDate: '2025-04-08',
    productDesc: 'جوال Samsung Galaxy S25',
    serialNumber: 'SS25-001',
    costPrice: 600,
    cashPrice: 1200,
    downPayment: 0,
    profitRate: 20,
    profitAmount: 1920,
    totalAmount: 9600,
    installmentAmount: 800,
    installmentsCount: 12,
    period: 'شهري',
    firstInstallmentDate: '2025-05-01',
    repName: 'أحمد سالم',
    witnessName: 'محمد الفاتح',
    notes: 'يلتزم العميل بسداد الأقساط في مواعيدها المحددة. في حالة التأخر يترتب على ذلك رسوم تأخير. هذا العقد ملزم لكلا الطرفين وفق الأنظمة المعمول بها في المملكة العربية السعودية.',
  },
  {
    id: '#2025-102',
    customerName: 'فيصل محمد الدوسري',
    nationalId: '1023456789',
    phone: '0556789012',
    address: 'جدة، حي الروضة',
    contractDate: '2025-03-15',
    productDesc: 'لابتوب Dell XPS 15',
    serialNumber: 'DEL-XPS-002',
    costPrice: 2000,
    cashPrice: 2500,
    downPayment: 500,
    profitRate: 15,
    profitAmount: 450,
    totalAmount: 2450,
    installmentAmount: 204,
    installmentsCount: 12,
    period: 'شهري',
    firstInstallmentDate: '2025-04-15',
    repName: 'محمد عبدالله',
    witnessName: 'سلمى العتيبي',
    notes: 'تم التحقق من الهوية وسجل الائتمان. العميل ملتزم.',
  },
];
