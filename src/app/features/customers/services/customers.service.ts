import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  Customer, CustomerFormData,
  InstallmentRow, PaymentRecord, PaymentContractOption,
  RescheduleRequest, CreditRatingItem,
} from '../models/customer.model';
import { PaginatedResponse, QueryParams } from '../../../core/services/api.service';
import { generateUUID } from '../../../shared/utils/uuid.util';
// import { ApiService } from '../../../core/services/api.service'; // فعّل عند ربط API

@Injectable({ providedIn: 'root' })
export class CustomersService {

  // ── CRUD ─────────────────────────────────────────────────────────────────

  getAll(params?: QueryParams): Observable<PaginatedResponse<Customer>> {
    let filtered = [...MOCK_CUSTOMERS];

    if (params?.['search']) {
      const q = String(params['search']).toLowerCase();
      filtered = filtered.filter(
        (c) => c.name.includes(q) || c.phone.includes(q) || c.nationalId.includes(q)
      );
    }
    if (params?.['status'])      filtered = filtered.filter(c => c.paymentStatus === params['status']);
    if (params?.['creditScore']) filtered = filtered.filter(c => c.creditScore    === params['creditScore']);

    const page  = Number(params?.['page']  ?? 1);
    const limit = Number(params?.['limit'] ?? 10);
    const start = (page - 1) * limit;

    return of({
      data:       filtered.slice(start, start + limit),
      total:      filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    }).pipe(delay(250));
  }

  getById(id: string): Observable<Customer> {
    const found = MOCK_CUSTOMERS.find((c) => c.id === id);
    return found
      ? of(found).pipe(delay(200))
      : throwError(() => new Error('عميل غير موجود'));
  }

  create(data: CustomerFormData): Observable<Customer> {
    const afterDown     = (data.cashPrice - data.downPayment);
    const totalAmount   = afterDown * (1 + data.profitRate / 100);
    const installAmt    = data.installmentsCount > 0 ? totalAmount / data.installmentsCount : 0;
    const newCustomer: Customer = {
      id:                generateUUID(),
      name:              data.name,
      phone:             data.phone,
      address:           data.address  ?? '',
      nationalId:        data.nationalId,
      creditScore:       'B',
      product:           data.product  ?? '',
      totalInstallments: data.installmentsCount,
      paidInstallments:  0,
      installmentAmount: installAmt,
      totalAmount,
      remainingAmount:   totalAmount,
      dueAmount:         installAmt,
      paymentStatus:     'new',
      installmentPeriod: data.installmentPeriod,
      startDate:         data.purchaseDate ?? new Date().toISOString().split('T')[0],
      lastPaymentDate:   null,
      repId:             data.repId,
      repName:           null,
      notes:             data.notes,
    };
    MOCK_CUSTOMERS.unshift(newCustomer);
    return of(newCustomer).pipe(delay(400));
  }

  update(id: string, data: Partial<CustomerFormData>): Observable<Customer> {
    const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === id);
    if (idx === -1) return throwError(() => new Error('عميل غير موجود'));
    MOCK_CUSTOMERS[idx] = { ...MOCK_CUSTOMERS[idx], ...data } as Customer;
    return of(MOCK_CUSTOMERS[idx]).pipe(delay(400));
  }

  delete(id: string): Observable<void> {
    const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === id);
    if (idx !== -1) MOCK_CUSTOMERS.splice(idx, 1);
    return of(undefined).pipe(delay(300));
  }

  // ── Installments & Payments ───────────────────────────────────────────────

  getInstallments(customerId: string): Observable<InstallmentRow[]> {
    const rows = MOCK_INSTALLMENTS[customerId] ?? MOCK_INSTALLMENTS['1'];
    return of(rows).pipe(delay(200));
  }

  getRecentPayments(): Observable<PaymentRecord[]> {
    return of(MOCK_PAYMENTS).pipe(delay(150));
  }

  getPaymentContracts(): Observable<PaymentContractOption[]> {
    return of(MOCK_PAYMENT_OPTIONS).pipe(delay(150));
  }

  recordPayment(_data: { contractId: string; amount: number; method: string; date: string }): Observable<void> {
    return of(undefined).pipe(delay(400));
  }

  // ── Reschedule ────────────────────────────────────────────────────────────

  getRescheduleRequests(): Observable<RescheduleRequest[]> {
    return of(MOCK_RESCHEDULE).pipe(delay(150));
  }

  submitReschedule(_data: object): Observable<void> {
    return of(undefined).pipe(delay(400));
  }

  // ── Credit Ratings ────────────────────────────────────────────────────────

  getCreditRatings(): Observable<CreditRatingItem[]> {
    return of(MOCK_CREDIT_RATINGS).pipe(delay(200));
  }
}

// ═══════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════

let MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1', name: 'خالد العمري',    phone: '0501234567', address: 'الرياض',
    nationalId: '1234567890', creditScore: 'A', product: 'Samsung S25',
    totalInstallments: 12, paidInstallments: 4,  installmentAmount: 800,
    totalAmount: 9600, remainingAmount: 7200, dueAmount: 800,
    paymentStatus: 'late', installmentPeriod: 'شهري',
    startDate: '2025-01-01', lastPaymentDate: '2025-03-03',
    repId: null, repName: null, notes: 'متأخر قسط واحد',
  },
  {
    id: '2', name: 'سارة الغامدي',   phone: '0557891234', address: 'جدة',
    nationalId: '0987654321', creditScore: 'C', product: 'ثلاجة LG Smart',
    totalInstallments: 24, paidInstallments: 2,  installmentAmount: 450,
    totalAmount: 10800, remainingAmount: 10350, dueAmount: 450,
    paymentStatus: 'defaulted', installmentPeriod: 'شهري',
    startDate: '2025-02-01', lastPaymentDate: '2025-02-28',
    repId: null, repName: null, notes: 'متأخر عدة أقساط',
  },
  {
    id: '3', name: 'فيصل الدوسري',   phone: '0534561234', address: 'الرياض',
    nationalId: '1122334455', creditScore: 'A', product: 'Dell XPS',
    totalInstallments: 18, paidInstallments: 7,  installmentAmount: 600,
    totalAmount: 10800, remainingAmount: 6600, dueAmount: 600,
    paymentStatus: 'current', installmentPeriod: 'شهري',
    startDate: '2024-09-01', lastPaymentDate: '2025-04-05',
    repId: null, repName: null, notes: '',
  },
  {
    id: '4', name: 'نورة السعيد',    phone: '0509871234', address: 'الدمام',
    nationalId: '3210987654', creditScore: 'B', product: 'غسالة Bosch',
    totalInstallments: 12, paidInstallments: 1,  installmentAmount: 350,
    totalAmount: 4200, remainingAmount: 4200, dueAmount: 350,
    paymentStatus: 'new', installmentPeriod: 'أسبوعي',
    startDate: '2025-04-01', lastPaymentDate: null,
    repId: null, repName: null, notes: '',
  },
  {
    id: '5', name: 'أحمد القحطاني', phone: '0556781234', address: 'الرياض',
    nationalId: '5566778899', creditScore: 'A', product: 'أثاث غرفة نوم',
    totalInstallments: 36, paidInstallments: 11, installmentAmount: 300,
    totalAmount: 10800, remainingAmount: 7500, dueAmount: 300,
    paymentStatus: 'current', installmentPeriod: 'شهري',
    startDate: '2024-06-01', lastPaymentDate: '2025-04-01',
    repId: null, repName: null, notes: '',
  },
];

// ── Installment schedules ──────────────────────────────────────
const MOCK_INSTALLMENTS: Record<string, InstallmentRow[]> = {
  '1': [
    { num: 1,  period: 'يناير 2025',  due: 800, paid: 800, remaining: 0,   paymentDate: '2 يناير',   method: 'نقدي',   status: 'paid' },
    { num: 2,  period: 'فبراير 2025', due: 800, paid: 800, remaining: 0,   paymentDate: '1 فبراير',  method: 'تحويل',  status: 'paid' },
    { num: 3,  period: 'مارس 2025',   due: 800, paid: 800, remaining: 0,   paymentDate: '3 مارس',    method: 'نقدي',   status: 'paid' },
    { num: 4,  period: 'أبريل 2025',  due: 800, paid: 400, remaining: 400, paymentDate: '3 أبريل',   method: 'نقدي',   status: 'partial' },
    { num: 5,  period: 'مايو 2025',   due: 800, paid: 0,   remaining: 800, paymentDate: null,         method: null,     status: 'upcoming' },
    { num: 6,  period: 'يونيو 2025',  due: 800, paid: 0,   remaining: 800, paymentDate: null,         method: null,     status: 'upcoming' },
    { num: 7,  period: 'يوليو 2025',  due: 800, paid: 0,   remaining: 800, paymentDate: null,         method: null,     status: 'upcoming' },
    { num: 8,  period: 'أغسطس 2025',  due: 800, paid: 0,   remaining: 800, paymentDate: null,         method: null,     status: 'upcoming' },
    { num: 9,  period: 'سبتمبر 2025', due: 800, paid: 0,   remaining: 800, paymentDate: null,         method: null,     status: 'upcoming' },
    { num: 10, period: 'أكتوبر 2025', due: 800, paid: 0,   remaining: 800, paymentDate: null,         method: null,     status: 'upcoming' },
    { num: 11, period: 'نوفمبر 2025', due: 800, paid: 0,   remaining: 800, paymentDate: null,         method: null,     status: 'upcoming' },
    { num: 12, period: 'ديسمبر 2025', due: 800, paid: 0,   remaining: 800, paymentDate: null,         method: null,     status: 'upcoming' },
  ],
  '3': [
    { num: 1, period: 'سبتمبر 2024',  due: 600, paid: 600, remaining: 0,   paymentDate: '1 سبتمبر',  method: 'مدى',    status: 'paid' },
    { num: 2, period: 'أكتوبر 2024',  due: 600, paid: 600, remaining: 0,   paymentDate: '2 أكتوبر',  method: 'مدى',    status: 'paid' },
    { num: 3, period: 'نوفمبر 2024',  due: 600, paid: 600, remaining: 0,   paymentDate: '1 نوفمبر',  method: 'تحويل',  status: 'paid' },
    { num: 4, period: 'ديسمبر 2024',  due: 600, paid: 600, remaining: 0,   paymentDate: '3 ديسمبر',  method: 'مدى',    status: 'paid' },
    { num: 5, period: 'يناير 2025',   due: 600, paid: 600, remaining: 0,   paymentDate: '2 يناير',   method: 'مدى',    status: 'paid' },
    { num: 6, period: 'فبراير 2025',  due: 600, paid: 600, remaining: 0,   paymentDate: '1 فبراير',  method: 'نقدي',   status: 'paid' },
    { num: 7, period: 'مارس 2025',    due: 600, paid: 600, remaining: 0,   paymentDate: '1 مارس',    method: 'مدى',    status: 'paid' },
    { num: 8, period: 'أبريل 2025',   due: 600, paid: 0,   remaining: 600, paymentDate: null,         method: null,     status: 'upcoming' },
  ],
};

// ── Recent payments ────────────────────────────────────────────
const MOCK_PAYMENTS: PaymentRecord[] = [
  { id: 'p1', customerName: 'فيصل الدوسري',   amount: 600, date: '5 أبريل',  method: 'مدى',   status: 'complete'  },
  { id: 'p2', customerName: 'خالد العمري',    amount: 400, date: '3 أبريل',  method: 'نقدي',  status: 'partial'   },
  { id: 'p3', customerName: 'خالد العمري',    amount: 400, date: '6 أبريل',  method: 'نقدي',  status: 'remainder' },
  { id: 'p4', customerName: 'أحمد القحطاني', amount: 300, date: '1 أبريل',  method: 'تحويل', status: 'complete'  },
];

// ── Payment contract options ───────────────────────────────────
const MOCK_PAYMENT_OPTIONS: PaymentContractOption[] = [
  { id: '1', label: 'خالد العمري — Samsung (4/12) — مستحق 800 ر.س',    due: 800, prevPaid: 400, totalDue: 1200 },
  { id: '2', label: 'سارة الغامدي — ثلاجة (متأخر) — مستحق 900 ر.س',   due: 900, prevPaid: 0,   totalDue: 1350 },
  { id: '3', label: 'فيصل الدوسري — Dell (8/18) — مستحق 600 ر.س',      due: 600, prevPaid: 0,   totalDue: 600  },
  { id: '5', label: 'أحمد القحطاني — أثاث (12/36) — مستحق 300 ر.س',   due: 300, prevPaid: 0,   totalDue: 300  },
];

// ── Reschedule requests ────────────────────────────────────────
const MOCK_RESCHEDULE: RescheduleRequest[] = [
  { id: 'r1', customerName: 'فيصل الدوسري',  type: 'تأجيل قسط',    date: '15 مارس',       status: 'accepted' },
  { id: 'r2', customerName: 'سارة الغامدي',  type: 'تمديد المدة',   date: 'قيد المراجعة',  status: 'pending'  },
];

// ── Credit ratings ─────────────────────────────────────────────
const MOCK_CREDIT_RATINGS: CreditRatingItem[] = [
  {
    customerId: '3', customerName: 'فيصل الدوسري',
    activeContracts: 2, commitmentRate: 100, avgDelayDays: 0, rescheduleCount: 0,
    historyDesc: 'منذ 2 سنة', score: 'A', numericScore: 95, recommendation: 'رفع الحد',
  },
  {
    customerId: '1', customerName: 'خالد العمري',
    activeContracts: 3, commitmentRate: 92, avgDelayDays: 3, rescheduleCount: 0,
    historyDesc: 'منذ 3 سنوات', score: 'A', numericScore: 88, recommendation: 'موافق',
  },
  {
    customerId: '5', customerName: 'أحمد القحطاني',
    activeContracts: 1, commitmentRate: 85, avgDelayDays: 7, rescheduleCount: 0,
    historyDesc: 'منذ 1 سنة', score: 'B', numericScore: 75, recommendation: 'موافق',
  },
  {
    customerId: '4', customerName: 'نورة السعيد',
    activeContracts: 1, commitmentRate: 100, avgDelayDays: 0, rescheduleCount: 0,
    historyDesc: 'منذ أسبوعين', score: 'B', numericScore: 70, recommendation: 'متابعة',
  },
  {
    customerId: '2', customerName: 'سارة الغامدي',
    activeContracts: 1, commitmentRate: 60, avgDelayDays: 15, rescheduleCount: 1,
    historyDesc: 'منذ 8 أشهر', score: 'C', numericScore: 52, recommendation: 'مقدم مرتفع',
  },
];
