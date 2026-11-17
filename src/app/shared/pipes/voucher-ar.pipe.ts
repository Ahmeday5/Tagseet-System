import { Pipe, PipeTransform } from '@angular/core';

const EMPTY = '—';

/**
 * Voucher-number display. Voucher numbers are plain sequential serials
 * (e.g. `"1543"`) and are rendered verbatim — never truncated, and never
 * parsed for a type prefix (derive the voucher type from its own field).
 * Only normalises blanks to a dash.
 */
@Pipe({ name: 'voucherAr', standalone: true })
export class VoucherArPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value == null) return EMPTY;
    const text = String(value).trim();
    return text || EMPTY;
  }
}
