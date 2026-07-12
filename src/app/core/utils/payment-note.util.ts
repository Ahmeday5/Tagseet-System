/**
 * Translates the backend-appended `"Payment Method: {method}."` fragment
 * inside a voucher/payment `notes` string to Arabic, leaving any other
 * free-text the user actually typed untouched.
 *
 * The backend stamps this fragment onto EVERY installment/down-payment
 * voucher note (see `ContractPaymentRow.notes`, e.g. `"Payment Method: cash. "`)
 * — it is not optional decoration, so it must never reach the UI in English.
 * Wording matches the payment-method picker already shown to the user
 * (see the `<select formControlName="paymentMethod">` options in
 * `statement.component.html`) so the same method reads identically everywhere.
 */
const PAYMENT_METHOD_LABELS_AR: Readonly<Record<string, string>> = {
  cash: 'نقدي',
  transfer: 'تحويل بنكي',
  card: 'بطاقة',
  stcpay: 'STC Pay',
  applepay: 'Apple Pay',
};

const PAYMENT_METHOD_FRAGMENT = /payment\s*method\s*:\s*([a-z]+)\.?\s*/gi;

/**
 * Returns the note with any `Payment Method: X.` fragment replaced by its
 * Arabic equivalent (`طريقة الدفع: نقدي.`). Unknown method tokens are title-
 * cased and kept as-is rather than dropped, so an unmapped/new method is
 * still visible instead of silently disappearing. Returns `null`/`''` as-is.
 */
export function translatePaymentNote(
  notes: string | null | undefined,
): string | null {
  if (!notes) return notes ?? null;

  return notes.replace(PAYMENT_METHOD_FRAGMENT, (_match, method: string) => {
    const key = method.toLowerCase();
    const ar = PAYMENT_METHOD_LABELS_AR[key] ?? method;
    return `طريقة الدفع: ${ar}. `;
  }).trim();
}
