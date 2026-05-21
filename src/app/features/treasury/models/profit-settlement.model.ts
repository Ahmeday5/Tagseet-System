/**
 * Profit settlement (تسوية/توزيع الأرباح) — distributes the balance of the
 * profits treasury across shareholders, proportional to each one's ownership,
 * issuing a payment voucher per shareholder.
 *
 * Shapes mirror the `dashboard/shareholders/profit-settlement[s]` endpoints.
 */

/** One shareholder's slice of a distribution (preview or executed). */
export interface ProfitSettlementLine {
  shareholderId: number;
  shareholderName: string;
  contributedAmount: number;
  /** Share of the distributed total (%). */
  percentage: number;
  amount: number;
  /** Issued only once the settlement is executed — absent/empty in the preview. */
  voucherNumber?: string;
}

/**
 * `GET /profit-settlement/preview` — the profits treasury to draw from plus a
 * dry-run of how the *current* profit balance would be split. `lines` is empty
 * (and `totalAmount` is 0) when there's nothing to distribute.
 */
export interface ProfitSettlementPreview {
  profitsTreasuryId: number;
  profitsTreasuryName: string;
  totalAmount: number;
  lines: ProfitSettlementLine[];
}

/**
 * `POST /profit-settlement` body. `treasuryId` is the profits treasury taken
 * from the preview — the user picks the date and an optional note only.
 */
export interface CreateProfitSettlementPayload {
  treasuryId: number;
  /** `yyyy-MM-dd` — calendar date, not a timestamp. */
  date: string;
  notes: string;
}

/**
 * Full settlement record — returned by both the POST response and
 * `GET /profit-settlements/{id}`. `treasuryBalanceAfter` is present only on
 * the POST response (the treasury is drained to zero on success).
 */
export interface ProfitSettlement {
  id: number;
  settlementDate: string;
  profitsTreasuryId: number;
  profitsTreasuryName: string;
  totalAmount: number;
  treasuryBalanceAfter?: number;
  notes: string | null;
  lines: ProfitSettlementLine[];
}

/** Row shape returned by `GET /profit-settlements` (paged). */
export interface ProfitSettlementRow {
  id: number;
  settlementDate: string;
  profitsTreasuryName: string;
  totalAmount: number;
  shareholdersCount: number;
  notes: string | null;
}

/** Query parameters for the paginated settlements history. */
export interface ProfitSettlementsQuery {
  pageIndex?: number;
  pageSize?: number;
}
