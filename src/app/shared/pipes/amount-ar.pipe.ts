import { Pipe, PipeTransform } from '@angular/core';

const FORMATTER = new Intl.NumberFormat('ar-EG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ALM keeps the sign on the reading-start side inside RTL text. */
const MINUS = '؜−';

/**
 * Plain money figure for dense report grids — no currency suffix, thousands
 * separators and exactly two decimals, zero rendered as `0.00` so a cell is
 * never blank. Negatives get a true minus sign (−); colour them at the
 * call-site.
 */
@Pipe({ name: 'amountAr', standalone: true })
export class AmountArPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return '—';
    const text = FORMATTER.format(Math.abs(value));
    // Rounds to 0.00 → no sign, avoids "−٠٫٠٠".
    return value < 0 && text !== FORMATTER.format(0) ? MINUS + text : text;
  }
}

const PERCENT_FORMATTER = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 });

/** Percentage already on a 0–100 scale, e.g. `12.5` → `١٢٫٥٪`. */
@Pipe({ name: 'percentAr', standalone: true })
export class PercentArPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return '—';
    return `${value < 0 ? MINUS : ''}${PERCENT_FORMATTER.format(Math.abs(value))}٪`;
  }
}
