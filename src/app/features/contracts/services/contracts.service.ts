import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';
import {
  Contract,
  ContractFormState,
  CreatedContract,
  CreateContractPayload,
  buildCreateContractPayload,
} from '../models/contract.model';

const CONTRACTS_CACHE_KEY = 'contracts';

@Injectable({ providedIn: 'root' })
export class ContractsService {
  private readonly api = inject(ApiService);

  // ─────────── live API ───────────

  /**
   * Direct installment-contract creation.
   *
   * Accepts either the form-state object (preferred — `representativeId`
   * is stripped automatically when not selected) or a fully-formed
   * payload built by the caller.
   *
   * The backend can reject with `400 Insufficient inventory quantity.`
   * when the requested product isn't fully in stock at the chosen
   * warehouse — surface that message verbatim to the user.
   */
  create(
    formOrPayload: ContractFormState | CreateContractPayload,
  ): Observable<CreatedContract> {
    const body = this.isFormState(formOrPayload)
      ? buildCreateContractPayload(formOrPayload)
      : formOrPayload;

    return this.api.post<CreatedContract>(
      API_ENDPOINTS.contracts.base,
      body,
      {
        context: withInlineHandling(
          withCacheInvalidate([
            CONTRACTS_CACHE_KEY,
            'client',     // contracts affect client receivables
            'warehous',   // stock is decremented at the warehouse
            'treasur',    // down payment moves into the treasury
            'invoice',    // related invoice aggregates change
            'financial-separation',
          ]),
        ),
      },
    );
  }

  /**
   * Type-guard for `create()`. `ContractFormState` carries a nullable
   * `representativeId`; `CreateContractPayload` only has it when it's
   * actually being sent.
   */
  private isFormState(
    value: ContractFormState | CreateContractPayload,
  ): value is ContractFormState {
    // ContractFormState always includes representativeId (even if null),
    // and it doesn't have the 'status' or other fields of CreatedContract
    // (though CreateContractPayload also doesn't have them).
    // The key difference is that ContractFormState is intended to be processed
    // by buildCreateContractPayload.
    return 'representativeId' in value;
  }

  // ─────────── legacy mock (kept for the existing contracts UI) ───────────

  getAll(): Observable<Contract[]> {
    return of([...MOCK_CONTRACTS]).pipe(delay(250));
  }

  getById(id: string): Observable<Contract | undefined> {
    return of(MOCK_CONTRACTS.find((c) => c.id === id)).pipe(delay(150));
  }

  createMock(contract: Omit<Contract, 'id'>): Observable<Contract> {
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
