import { Pipe, PipeTransform } from '@angular/core';

const EMPTY = '—';
/** Beyond this length a raw voucher string is squeezed to a readable tail. */
const MAX_LEN = 14;

/**
 * Compact voucher-number display for dense grids. Long machine vouchers
 * (e.g. `CB-20261116-000000123`) are shortened to their most meaningful tail
 * — the trailing serial after the last separator — prefixed with `…` so the
 * cell stays narrow. Short/human vouchers pass through untouched.
 *
 * Always pair with the full value in a `title` so the original is one hover
 * away:
 *
 *   <span [title]="e.voucherNumber">{{ e.voucherNumber | voucherAr }}</span>
 */
@Pipe({ name: 'voucherAr', standalone: true })
export class VoucherArPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value == null) return EMPTY;
    const text = String(value).trim();
    if (!text) return EMPTY;
    if (text.length <= MAX_LEN) return text;

    // Prefer the trailing serial after the last separator; fall back to a slice.
    const tail = text.split(/[-_/\\\s]/).pop() ?? text;
    const compact = tail.length && tail.length <= MAX_LEN ? tail : text.slice(-MAX_LEN);
    return `…${compact}`;
  }
}
