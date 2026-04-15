import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { TreasuryTransaction, TreasurySummary, Shareholder } from '../models/treasury.model';
import { generateUUID } from '../../../shared/utils/uuid.util';
// import { ApiService } from '../../../core/services/api.service'; // فعّل عند ربط API

export interface TreasuryData {
  summary: TreasurySummary;
  transactions: TreasuryTransaction[];
}

@Injectable({ providedIn: 'root' })
export class TreasuryService {
  // private readonly api = inject(ApiService);

  getData(): Observable<TreasuryData> {
    // استبدل بـ: return this.api.get<TreasuryData>('treasury');
    return of({ summary: MOCK_SUMMARY, transactions: [...MOCK_TRANSACTIONS] }).pipe(delay(250));
  }

  getShareholders(): Observable<Shareholder[]> {
    // استبدل بـ: return this.api.get<Shareholder[]>('treasury/shareholders');
    return of([...MOCK_SHAREHOLDERS]).pipe(delay(200));
  }

  addTransaction(tx: Omit<TreasuryTransaction, 'id' | 'balance'>): Observable<TreasuryTransaction> {
    const newTx: TreasuryTransaction = {
      ...tx,
      id: generateUUID(),
      balance: MOCK_SUMMARY.mainBalance + (tx.type === 'income' ? tx.amount : -tx.amount),
    };
    MOCK_TRANSACTIONS.unshift(newTx);
    return of(newTx).pipe(delay(400));
  }
}

const MOCK_SUMMARY: TreasurySummary = {
  mainBalance: 89200,
  monthlyIncome: 42800,
  monthlyExpense: 24400,
  netCashflow: 18400,
  vatCollected: 6420,
  vatPaid: 0,
};

let MOCK_TRANSACTIONS: TreasuryTransaction[] = [
  { id: '1', date: '2025-04-08', description: 'تحصيل قسط — عبدالله العمري', type: 'income',  amount: 700,  balance: 89200, category: 'تحصيل أقساط' },
  { id: '2', date: '2025-04-07', description: 'دفع مورد — شركة التقنية',    type: 'expense', amount: 5000, balance: 88500, category: 'مشتريات'      },
  { id: '3', date: '2025-04-06', description: 'تحصيل قسط — فاطمة السالم',  type: 'income',  amount: 900,  balance: 93500, category: 'تحصيل أقساط' },
  { id: '4', date: '2025-04-05', description: 'مصاريف تشغيل',              type: 'expense', amount: 1200, balance: 92600, category: 'مصاريف'       },
  { id: '5', date: '2025-04-04', description: 'تحصيل قسط — نورة الحربي',   type: 'income',  amount: 500,  balance: 93800, category: 'تحصيل أقساط' },
];

let MOCK_SHAREHOLDERS: Shareholder[] = [
  { id: '1', name: 'محمد الفاتح',   phone: '0501234500', address: 'الرياض',  creditAmount: 45000, debitAmount: 12000, ownershipPct: 50, note: 'مؤسس رئيسي' },
  { id: '2', name: 'أحمد العلي',    phone: '0556781200', address: 'جدة',     creditAmount: 30000, debitAmount: 8500,  ownershipPct: 33, note: 'شريك'        },
  { id: '3', name: 'نورة الصالح',   phone: '0512341200', address: 'الدمام',  creditAmount: 15000, debitAmount: 4000,  ownershipPct: 17, note: 'شريكة'       },
];
