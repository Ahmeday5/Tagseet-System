import { UserRole } from '../../../core/models/auth.model';

/** A single user as returned by `GET /dashboard/app-users` and `GET /dashboard/app-users/{id}`. */
export interface AppUser {
  id: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
}

/** Wire payload for `POST /dashboard/app-users` — password is mandatory on create. */
export interface CreateAppUserPayload {
  email: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
}

/**
 * Wire payload for `PUT /dashboard/app-users/{id}` — password is optional;
 * omit the field entirely to keep the existing one. Sending an empty string
 * is treated by the backend as "set password to empty" and is therefore
 * never sent.
 */
export interface UpdateAppUserPayload {
  email: string;
  phoneNumber: string;
  password?: string;
  role: UserRole;
}

/** Response shape for create/update — same id+email+role echo. */
export interface AppUserMutationResult {
  id: string;
  email: string;
  role: UserRole;
}

/** A single entry from `GET /dashboard/app-users/roles` (already inside the envelope's `data`). */
export interface RoleOption {
  /** Role id, used as the `role` value (e.g. "GeneralManager"). */
  id: UserRole;
  /** Localized Arabic label to render in the dropdown. */
  nameAr: string;
}
