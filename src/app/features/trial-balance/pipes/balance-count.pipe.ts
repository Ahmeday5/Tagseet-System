import { Pipe, PipeTransform } from '@angular/core';
import { formatCount } from '../utils/balance-format.util';

/** `{{ value | balanceCount }}` → Arabic-digit integer / quantity. */
@Pipe({ name: 'balanceCount', standalone: true })
export class BalanceCountPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : formatCount(value);
  }
}
