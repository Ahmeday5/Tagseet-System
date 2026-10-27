import { Pipe, PipeTransform } from '@angular/core';

const FORMATTER = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 });

/**
 * Plain money figure for dense report grids — no currency suffix, up to two
 * decimals, and zero rendered as `0` (unlike `currencyAr`, which hides it)
 * so a cell is never blank. Negatives keep their sign; colour them at the
 * call-site.
 */
@Pipe({ name: 'amountAr', standalone: true })
export class AmountArPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value == null || !Number.isFinite(value) ? '—' : FORMATTER.format(value);
  }
}
