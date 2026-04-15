import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DashboardData } from '../models/dashboard.model';
// import { ApiService } from '../../../core/services/api.service'; // فعّل عند ربط API

@Injectable({ providedIn: 'root' })
export class DashboardService {
  // private readonly api = inject(ApiService);

  getDashboardData(): Observable<DashboardData> {
    // ──── Mock Data ────
    // استبدل هذا بـ: return this.api.get<DashboardData>('dashboard');
    return of(MOCK_DASHBOARD).pipe(delay(300));
  }
}

const MOCK_DASHBOARD: DashboardData = {
  stats: {
    totalCustomers: 148,
    totalReceivables: 284600,
    collectedThisMonth: 42800,
    mainTreasury: 89200,
    monthlyProfit: 18400,
    collectionRate: 87,
    lateCustomers: 5,
    lateAmount: 12400,
    ratingACount: 94,
    lowStockCount: 3,
    vatDue: 8420,
  },
  profitChart: [
    { month: 'نوف', amount: 13600, isCurrent: false },
    { month: 'ديس', amount: 15200, isCurrent: false },
    { month: 'يناير', amount: 14800, isCurrent: false },
    { month: 'فبراير', amount: 16400, isCurrent: false },
    { month: 'مارس', amount: 18900, isCurrent: false },
    { month: 'أبريل', amount: 18400, isCurrent: true },
  ],
  topCustomers: [
    {
      rank: 1,
      name: 'عبدالله العمري',
      paid: 8400,
      installments: 24,
      creditScore: 'A',
    },
    {
      rank: 2,
      name: 'فاطمة السالم',
      paid: 7200,
      installments: 18,
      creditScore: 'A',
    },
    {
      rank: 3,
      name: 'محمد الغامدي',
      paid: 6800,
      installments: 12,
      creditScore: 'B',
    },
    {
      rank: 4,
      name: 'نورة الحربي',
      paid: 5600,
      installments: 24,
      creditScore: 'A',
    },
    {
      rank: 5,
      name: 'خالد الزهراني',
      paid: 4900,
      installments: 12,
      creditScore: 'C',
    },
  ],
};
