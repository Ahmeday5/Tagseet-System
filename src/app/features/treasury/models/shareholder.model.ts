/**
 * Shareholder (مساهم) — a capital partner whose `contributedAmount` feeds a
 * capital treasury and earns a proportional `ownedPercentage` of profits.
 *
 * Shapes mirror the `dashboard/shareholders` endpoints exactly; the server
 * derives `ownedPercentage` and `totalProfitReceived`, so neither is sent on
 * write.
 */

/** Row / detail shape returned by `GET /dashboard/shareholders[/{id}]`. */
export interface Shareholder {
  id: number;
  name: string;
  phoneNumber: string;
  address: string;
  /** Capital injected by this shareholder — set once on create, server-managed after. */
  contributedAmount: number;
  /** Server-derived share of total capital (%). */
  ownedPercentage: number;
  /** Cumulative profit distributed to this shareholder so far. */
  totalProfitReceived: number;
  capitalTreasuryId: number;
  capitalTreasuryName: string;
  notes: string | null;
  createdAt: string;
}

/**
 * POST /dashboard/shareholders body. `contributedAmount` and the target
 * `capitalTreasuryId` are only meaningful at creation — the contribution can't
 * be re-routed afterwards.
 */
export interface CreateShareholderPayload {
  name: string;
  phoneNumber: string;
  address: string;
  contributedAmount: number;
  capitalTreasuryId: number;
  notes: string;
}

/**
 * PUT /dashboard/shareholders/{id} body. Only descriptive fields are editable;
 * the contribution and its treasury are immutable post-creation.
 */
export interface UpdateShareholderPayload {
  name: string;
  phoneNumber: string;
  address: string;
  notes: string;
}

/** Query parameters for `GET /dashboard/shareholders` — `search` matches name or phone. */
export interface ShareholdersQuery {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
}
