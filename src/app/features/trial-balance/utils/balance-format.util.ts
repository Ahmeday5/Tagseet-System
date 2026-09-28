import { environment } from '../../../../environments/environment';

/**
 * Trial-balance figures are shown to the piastre: the whole point of the
 * screen is spotting small differences, so the app-wide rounding
 * `currencyAr` pipe is not suitable here.
 */
const AMOUNT_FORMAT = new Intl.NumberFormat('ar-EG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COUNT_FORMAT = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 });

const PERCENT_FORMAT = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 });

/** Values closer to zero than this are treated as exactly zero (float noise). */
export const BALANCE_EPSILON = 0.005;

export function isZeroAmount(value: number): boolean {
  return Math.abs(value) < BALANCE_EPSILON;
}

export function formatAmount(value: number, withCurrency = true): string {
  const safe = Number.isFinite(value) && !isZeroAmount(value) ? value : 0;
  const text = AMOUNT_FORMAT.format(safe);
  return withCurrency ? `${text} ${environment.currency}` : text;
}

export function formatCount(value: number): string {
  return COUNT_FORMAT.format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number): string {
  return `${PERCENT_FORMAT.format(Number.isFinite(value) ? value : 0)}%`;
}
