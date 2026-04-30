/**
 * Roles as returned by the backend (case-sensitive). Match the values in
 * `GET /dashboard/app-users/roles`.
 */
export type UserRole =
  | 'Admin'
  | 'GeneralManager'
  | 'Supervisor'
  | 'Accountant'
  | 'Representative'
  | 'Client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  permissions: string[];
}

/** Local, normalized token bundle used everywhere inside the app. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Millisecond epoch — sourced from the JWT `exp` claim. */
  expiresAt: number;
}

// ─────────── Wire shapes (must match backend exactly) ───────────

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
  deviceInfo: string;
  deviceId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceInfo: string;
  deviceId: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

/**
 * Shape returned in the `data` field for /auth/login and /auth/refresh-token.
 * On refresh, user fields may come back empty — never overwrite the cached
 * user with an empty payload.
 */
export interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  userType: string;
  userId: string;
  email: string | null;
  userName: string | null;
  /** ISO date — may be `0001-01-01T00:00:00` on refresh. JWT `exp` is the source of truth. */
  expiresAtUtc: string;
}
