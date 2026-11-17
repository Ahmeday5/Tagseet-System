import { CurrencyArPipe } from '../../../shared/pipes/currency-ar.pipe';
import {
  CompanyProfitPosting,
  companyPostedTotal,
} from '../models/profit-settlement.model';

const currency = new CurrencyArPipe();

/**
 * One-line Arabic summary of what a capitalization / distribution posted to the
 * company balance: `totalCompanyShare + companyOwnProfit` in a single voucher.
 * A negative total (company loss) is reported as a deduction.
 */
export function companyPostingSummary(posting: CompanyProfitPosting | null | undefined): string {
  const total = companyPostedTotal(posting);
  const amount = currency.transform(Math.abs(total), true);
  const movement = total < 0 ? `خُصم من رصيد الشركة ${amount}` : `دخل رصيد الشركة ${amount}`;
  const voucher = posting?.companyVoucherNumber?.trim();
  return voucher ? `${movement} (سند رقم ${voucher})` : movement;
}
