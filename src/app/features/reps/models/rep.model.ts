import {
  PagedQuery,
  PagedResponse,
} from '../../../core/models/api-response.model';

/**
 * Backend-defined representative permissions. Kept as a union of literal
 * strings so the values travel over the wire unchanged.
 *
 * Only `SalesAndCollection` has been confirmed against the live API at
 * the time of writing; the other variants follow the obvious symmetry
 * and are surfaced in the form for forward compatibility.
 */
export type RepresentativePermission =
  | 'SalesAndCollection'
  | 'SalesOnly'
  | 'CollectionOnly';

export type RepresentativeStatus = 'Active' | 'NotActive';

/** Trimmed `appUser` projection embedded on every representative payload. */
export interface RepresentativeAppUser {
  id: string;
  email: string;
  userName: string;
}

/**
 * Auto-created sub-treasury attached to each representative. The backend
 * creates one on POST and references it by id on every subsequent read.
 */
export interface RepresentativeTreasury {
  id: number;
  name: string;
  currentBalance: number;
  type: string; // backend returns 'SubRepresentative' today
  isActive: boolean;
}

/** Full representative entity, identical between list and getById. */
export interface Representative {
  id: number;
  fullName: string;
  phoneNumber: string;
  permissions: RepresentativePermission;
  /** 0..100. */
  profitRatePercent: number;
  /** 0..5 — backend rejects values outside this range. */
  performanceRating: number;
  status: RepresentativeStatus;
  appUser: RepresentativeAppUser;
  treasury: RepresentativeTreasury;
}

/**
 * POST /dashboard/representatives.
 *
 * The backend creates the underlying `AppUser` from `email` + `password`
 * and the sub-treasury automatically — neither id is supplied here.
 */
export interface CreateRepresentativePayload {
  fullName: string;
  email: string;
  password?: string;
  phoneNumber: string;
  permissions: RepresentativePermission;
  profitRatePercent: number;
  performanceRating: number;
  status: RepresentativeStatus;
}

/**
 * PUT /dashboard/representatives/{id}.
 *
 * Same shape as create. `password` is optional on edit semantically, but
 * the API still expects the field — we send the existing value unchanged
 * when the user doesn't supply a new one (handled in the form).
 */
export type UpdateRepresentativePayload = CreateRepresentativePayload;

/** Query string for the paginated list — uses the project's shared shape. */
export type RepresentativesQuery = PagedQuery;

/** Wire shape after envelope unwrap. */
export type RepresentativesListResponse = PagedResponse<Representative>;
