import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';
import {
  InstallmentPaymentResult,
  PayInstallmentPayload,
  UpdateInstallmentPaymentPayload,
} from '../models/client-statement.model';

/**
 * Cache patterns invalidated by any installment-payment write.
 * A payment ripples across many widgets — keep this list explicit so any
 * future page that caches one of these slices auto-refreshes.
 */
const PAYMENT_INVALIDATE_KEYS = [
  'installment',
  'contract',
  'client',
  'payment',
  'treasur',
  'vouchers',
  'home-summary',
  'financial-separation',
] as const;

@Injectable({ providedIn: 'root' })
export class InstallmentsService {
  private readonly api = inject(ApiService);

  /**
   * POST /installments/pay
   *
   * Records ONE receipt voucher against an open contract; the backend spreads
   * it across installments oldest-first and returns that split.
   */
  pay(payload: PayInstallmentPayload): Observable<InstallmentPaymentResult> {
    return this.api.post<InstallmentPaymentResult>(
      API_ENDPOINTS.installments.pay,
      payload,
      { context: this.writeContext() },
    );
  }

  /**
   * PUT /dashboard/installments/payments/{voucherId}
   *
   * Edits a whole payment voucher (amount / treasury / date / notes). The
   * backend re-allocates every payment afterwards, so installment statuses
   * may change — callers must refetch the contract details.
   */
  updatePayment(
    voucherId: number,
    payload: UpdateInstallmentPaymentPayload,
  ): Observable<InstallmentPaymentResult> {
    return this.api.put<InstallmentPaymentResult>(
      API_ENDPOINTS.installments.paymentById(voucherId),
      payload,
      { context: this.writeContext() },
    );
  }

  /**
   * DELETE /dashboard/installments/payments/{voucherId}
   *
   * Deletes a whole payment voucher, deducts it from its treasury, and
   * re-allocates the remaining payments.
   */
  deletePayment(voucherId: number): Observable<void> {
    return this.api.delete<void>(
      API_ENDPOINTS.installments.paymentById(voucherId),
      { context: this.writeContext() },
    );
  }

  private writeContext() {
    return withInlineHandling(withCacheInvalidate([...PAYMENT_INVALIDATE_KEYS]));
  }
}
