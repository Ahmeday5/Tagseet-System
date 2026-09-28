import { Pipe, PipeTransform } from '@angular/core';
import { formatAmount } from '../utils/balance-format.util';

/** `{{ value | balanceAmount }}` → "١٬٢٨٣٫٧٤ ج.م" (keeps sign and piastres). */
@Pipe({ name: 'balanceAmount', standalone: true })
export class BalanceAmountPipe implements PipeTransform {
  transform(value: number | null | undefined, withCurrency = true): string {
    return value === null || value === undefined ? '—' : formatAmount(value, withCurrency);
  }
}
