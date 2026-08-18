import { PagedResponse } from '../../../core/models/api-response.model';

/**
 * Backend status enum returned by `GET /dashboard/clients`.
 *
 *   New             — client has no contract yet
 *   OnTrack         — has contract(s); zero overdue installments
 *   OneOverdue      — exactly one installment overdue
 *   MultipleOverdue — two or more installments overdue
 */
export type DashboardClientStatus =
  | 'New'
  | 'OnTrack'
  | 'OneOverdue'
  | 'MultipleOverdue';

/**
 * Server-computed credit rating. `null` when `status === 'New'` (the client
 * has no contract on which to base a rating).
 *
 *   A — 0 overdue installments
 *   B — 1 overdue installment
 *   C — 2 or 3 overdue installments
 *   D — 4 or more overdue installments
 */
export type DashboardClientRating = 'A' | 'B' | 'C' | 'D';

/**
 * Wire shape of a single row in the clients list. Aggregate fields
 * (`goods`, `installmentProgress`, etc.) are `null` for clients without
 * a contract — keep them optional/nullable so the renderer can fall back
 * to a placeholder rather than crashing.
 */
export interface DashboardClient {
  id: number;
  fullName: string;
  phoneNumber: string;
  address: string;

  // ── contract aggregates across ALL of the client's contracts
  //    (null for `status === 'New'`) ──
  /** Every contract's goods, joined with "، " — not just one contract's. */
  goods: string | null;
  /** Display string in `paid/total` form aggregated across all contracts, e.g. "3/12". */
  installmentProgress: string | null;
  /** From the client's base (latest/active) contract — unaffected by the multi-contract aggregation above. */
  installmentAmount: number | null;
  /** Backend label, e.g. "Monthly". Translated at render time. From the base contract, same as `installmentAmount`. */
  paymentFrequency: string | null;
  /** Sum across ALL of the client's contracts. */
  totalContractAmount: number;
  /** Sum across ALL of the client's contracts. */
  remainingAmount: number;
  /** Total count of overdue installments across all of the client's contracts. */
  overdueInstallmentsCount: number;

  rating: DashboardClientRating | null;
  status: DashboardClientStatus;
}

/** Query params accepted by `GET /dashboard/clients`. */
export interface DashboardClientsQuery {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  /** When true, restrict the result set to overdue clients only. */
  onlyOverdue?: boolean;
}

/**
 * Wire shape of `data` after the standard `ApiResponse` envelope is
 * unwrapped — a paged client list plus the total count of overdue
 * clients (computed against the full dataset, not the current page).
 */
export interface DashboardClientsResponse {
  overdueClientsCount: number;
  clients: PagedResponse<DashboardClient>;
}

/** POST /dashboard/clients body. The backend creates the linked AppUser. */
export interface CreateClientPayload {
  fullName: string;
  email: string;
  nationalId: string;
  address: string;
  phoneNumber: string;
  whatsappNumber: string;
  password: string;
}

/**
 * PUT /dashboard/clients/{id} body. Same shape as the create payload but
 * without `password` (credentials are not edited here). `nationalId` may be
 * an empty string — it is optional.
 */
export interface UpdateClientPayload {
  fullName: string;
  email: string;
  nationalId: string;
  address: string;
  phoneNumber: string;
  whatsappNumber: string;
}

/**
 * Full client record returned by POST /dashboard/clients.
 * `nationalId` is nullable since it is optional on creation.
 */
export interface CreatedClient {
  id: number;
  fullName: string;
  email: string;
  nationalId: string | null;
  address: string;
  phoneNumber: string;
  whatsappNumber: string;
  createdAt: string;
}

/**
 * Detailed client object from `GET /dashboard/clients/{id}`.
 * Includes extended fields not present in the paged list.
 */
export interface ClientProfileClient {
  id: number;
  fullName: string;
  email: string | null;
  nationalId: string | null;
  address: string;
  phoneNumber: string;
  whatsappNumber: string;
  createdAt: string;
  clientCode: string | null;
  region: string | null;
  occupation: string | null;
  building: string | null;
  floor: string | null;
  department: string | null;
}

/** Full response of `GET /dashboard/clients/{id}`. */
export interface ClientProfileResponse {
  client: ClientProfileClient;
  totalContractsCount: number;
  overdueContractsCount: number;
}

/** POST /dashboard/clients/{id}/password body. */
export interface ChangeClientPasswordPayload {
  newPassword: string;
}
