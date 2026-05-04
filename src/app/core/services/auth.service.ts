import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, shareReplay, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { DeviceService } from './device.service';
import { ToastService } from './toast.service';
import { HttpCacheService } from './http-cache.service';
import {
  AuthResponseData,
  AuthTokens,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest,
  User,
  UserRole,
} from '../models/auth.model';
import { ApiError } from '../models/api-response.model';
import { API_ENDPOINTS } from '../constants/api-endpoints.const';
import {
  withInlineHandling,
  withSkipAuth,
} from '../http/http-context.tokens';
import { getJwtExpiry } from '../utils/jwt.util';

const USER_KEY = 'taqseet_user';
/** Refresh this many ms BEFORE the access token actually expires. */
const REFRESH_BUFFER_MS = 60 * 1000;
/** Lower bound for the proactive refresh timer to avoid timer storms on edge cases. */
const MIN_REFRESH_DELAY_MS = 5_000;
/** Backoff window after a transient (network/5xx) refresh failure. */
const REFRESH_RETRY_DELAY_MS = 30_000;
const BROADCAST_CHANNEL_NAME = 'taqseet-auth';

/**
 * Statuses that prove the refresh token itself is invalid — anything else
 * (network, CORS, 5xx) is treated as transient and triggers a backoff
 * retry instead of a forced logout.
 */
const AUTH_FATAL_STATUSES: ReadonlySet<number> = new Set([400, 401, 403]);

type CrossTabMessage =
  | { type: 'session-updated' }
  | { type: 'logged-out' };

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LogoutOptions {
  redirect?: boolean;
  callApi?: boolean;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);
  private readonly device = inject(DeviceService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly httpCache = inject(HttpCacheService);

  private readonly currentUserSignal = signal<User | null>(this.loadStoredUser());
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  /** Shared in-flight refresh — prevents duplicate network calls. */
  private inflightRefresh: Observable<AuthTokens> | null = null;
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;
  private channel: BroadcastChannel | null = null;
  private hasScheduledLogoutToast = false;

  constructor() {
    this.initCrossTabSync();
    this.initVisibilityRecovery();
    if (this.isLoggedIn()) {
      this.scheduleProactiveRefresh();
    }
  }

  // ──────────────────────── public API ────────────────────────

  login(input: LoginInput): Observable<User> {
    const dev = this.device.getInfo();
    const payload: LoginRequest = {
      email: input.email.trim(),
      password: input.password,
      rememberMe: input.rememberMe,
      deviceInfo: dev.deviceInfo,
      deviceId: dev.deviceId,
    };

    return this.api
      .post<AuthResponseData>(API_ENDPOINTS.auth.login, payload, {
        context: withInlineHandling(withSkipAuth()),
      })
      .pipe(
        tap((data) => this.persistSession(data, true)),
        map((data) => this.toUser(data))
      );
  }

  logout(opts: LogoutOptions = {}): void {
    const { redirect = true, callApi = true, reason } = opts;
    const refreshToken = this.getRefreshToken();

    if (callApi && refreshToken) {
      const payload: LogoutRequest = { refreshToken };
      // Fire-and-forget — never block redirect on the network roundtrip.
      this.api
        .post<unknown>(API_ENDPOINTS.auth.logout, payload, {
          context: withInlineHandling(),
        })
        .subscribe({ error: () => {} });
    }

    this.clearLocalSession();
    this.broadcast({ type: 'logged-out' });

    if (reason) this.toast.warning(reason);
    if (redirect) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Issues a refresh-token request, shared across concurrent callers. On
   * success the new tokens are persisted and the proactive timer is rescheduled.
   * On fatal failure the session is cleared and the user is redirected.
   */
  refreshToken(): Observable<AuthTokens> {
    if (this.inflightRefresh) return this.inflightRefresh;

    // Race shortcut: another tab may have already refreshed.
    const fromAnotherTab = this.readFreshTokens();
    if (fromAnotherTab) {
      this.scheduleProactiveRefresh();
      return of(fromAnotherTab);
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.scheduleSessionExpiredLogout();
      return throwError(() => this.makeAuthError('Missing refresh token'));
    }

    const dev = this.device.getInfo();
    const payload: RefreshTokenRequest = {
      refreshToken,
      deviceInfo: dev.deviceInfo,
      deviceId: dev.deviceId,
    };

    this.inflightRefresh = this.api
      .post<AuthResponseData>(API_ENDPOINTS.auth.refresh, payload, {
        context: withInlineHandling(withSkipAuth()),
      })
      .pipe(
        tap((data) => this.persistSession(data, false)),
        map((data) => this.extractTokens(data)),
        catchError((err) => {
          // Last-ditch race recovery: another tab might have refreshed
          // between our request being sent and the failure landing.
          const recovered = this.readFreshTokens();
          if (recovered) {
            this.scheduleProactiveRefresh();
            return of(recovered);
          }

          // Distinguish auth-fatal (server rejected the refresh token)
          // from transient (network blip, CORS, 5xx, runasp.net cold-
          // start). Only the former proves the session is dead — for
          // anything else we re-arm and let the user keep their session
          // until the server actually disowns the token.
          if (this.isAuthFatal(err)) {
            this.scheduleSessionExpiredLogout();
            return throwError(() => err);
          }

          this.scheduleRefreshRetry();
          return throwError(() => err);
        }),
        finalize(() => {
          this.inflightRefresh = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.inflightRefresh;
  }

  getAccessToken(): string | null {
    return this.storage.get(environment.tokenKey);
  }

  getRefreshToken(): string | null {
    return this.storage.get(environment.refreshTokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  }

  hasRole(role: UserRole): boolean {
    return this.currentUserSignal()?.role === role;
  }

  hasAnyRole(roles: ReadonlyArray<UserRole>): boolean {
    const current = this.currentUserSignal()?.role;
    return !!current && roles.includes(current);
  }

  hasPermission(permission: string | readonly string[]): boolean {
    const perms = this.currentUserSignal()?.permissions ?? [];
    if (perms.includes('all')) return true;
    return Array.isArray(permission)
      ? permission.every((p) => perms.includes(p))
      : perms.includes(permission as string);
  }

  // ────────────────────── persistence ──────────────────────

  /**
   * @param updateUser whether to overwrite the cached user from this response.
   *   `true` for /login (full payload), `false` for /refresh (user fields can
   *   come back empty and would clobber the real values).
   */
  private persistSession(data: AuthResponseData, updateUser: boolean): void {
    const tokens = this.extractTokens(data);
    this.storage.set(environment.tokenKey, tokens.accessToken);
    this.storage.set(environment.refreshTokenKey, tokens.refreshToken);

    if (updateUser && data.userId) {
      const user = this.toUser(data);
      this.storage.setJson(USER_KEY, user);
      this.currentUserSignal.set(user);
    } else if (!this.currentUserSignal()) {
      // Stale tab booting up after a previous refresh — rehydrate the user
      // we already have on disk so guards / role checks work immediately.
      const stored = this.loadStoredUser();
      if (stored) this.currentUserSignal.set(stored);
    }

    this.broadcast({ type: 'session-updated' });
    this.scheduleProactiveRefresh();
  }

  private clearLocalSession(): void {
    this.storage.remove(environment.tokenKey);
    this.storage.remove(environment.refreshTokenKey);
    this.storage.remove(USER_KEY);
    this.currentUserSignal.set(null);
    this.cancelScheduledRefresh();
    this.inflightRefresh = null;
    // Wipe the HTTP cache — leftover entries belong to the previous user
    // and would leak into the next session.
    this.httpCache.clear();
  }

  private loadStoredUser(): User | null {
    if (!this.getAccessToken() || !this.getRefreshToken()) return null;
    return this.storage.getJson<User>(USER_KEY);
  }

  // ────────────────────── mappers ──────────────────────

  private extractTokens(data: AuthResponseData): AuthTokens {
    if (!data?.accessToken || !data?.refreshToken) {
      throw new Error('Auth response missing tokens');
    }
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: this.resolveExpiry(data.accessToken, data.expiresAtUtc),
    };
  }

  private toUser(data: AuthResponseData): User {
    const userName =
      data.userName?.trim() ||
      data.email?.split('@')[0] ||
      'مستخدم';
    return {
      id: data.userId,
      name: userName,
      email: data.email ?? '',
      role: this.normalizeRole(data.userType),
      avatar: this.deriveAvatar(userName),
      permissions: [],
    };
  }

  private normalizeRole(raw: string | null | undefined): UserRole {
    const map: Record<string, UserRole> = {
      admin: 'Admin',
      generalmanager: 'GeneralManager',
      supervisor: 'Supervisor',
      accountant: 'Accountant',
      representative: 'Representative',
      client: 'Client',
    };
    return map[(raw ?? '').trim().toLowerCase()] ?? 'Client';
  }

  private deriveAvatar(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Resolves the access-token expiry. The JWT `exp` claim is the source of
   * truth — `expiresAtUtc` is treated as a hint and ignored when it's the
   * .NET default value (`0001-01-01...`) which the backend returns on refresh.
   */
  private resolveExpiry(accessToken: string, hint: string): number {
    const fromJwt = getJwtExpiry(accessToken);
    if (fromJwt && fromJwt > Date.now()) return fromJwt;

    if (hint && !hint.startsWith('0001-')) {
      const parsed = Date.parse(hint);
      if (!Number.isNaN(parsed) && parsed > Date.now()) return parsed;
    }

    // Last-resort: assume the documented 15-minute access-token window.
    return Date.now() + 15 * 60 * 1000;
  }

  /** Returns stored tokens IFF the access token is still safely valid. */
  private readFreshTokens(): AuthTokens | null {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    if (!accessToken || !refreshToken) return null;

    const expiresAt = getJwtExpiry(accessToken);
    if (!expiresAt) return null;
    if (expiresAt - Date.now() <= REFRESH_BUFFER_MS) return null;

    return { accessToken, refreshToken, expiresAt };
  }

  // ────────────────────── proactive refresh ──────────────────────

  private scheduleProactiveRefresh(): void {
    this.cancelScheduledRefresh();

    const accessToken = this.getAccessToken();
    if (!accessToken) return;

    const expiresAt = getJwtExpiry(accessToken);
    if (!expiresAt) return;

    const delay = Math.max(
      MIN_REFRESH_DELAY_MS,
      expiresAt - Date.now() - REFRESH_BUFFER_MS
    );

    // Schedule outside the Angular zone — we don't want a 14-minute idle
    // timer keeping zone.js "busy" and blocking stable detection (tests, SSR).
    this.zone.runOutsideAngular(() => {
      this.refreshTimerId = setTimeout(() => {
        this.zone.run(() => {
          if (!this.isLoggedIn()) return;
          this.refreshToken().subscribe({
            // Success/failure persistence is handled inside refreshToken().
            error: () => {/* fatal already handled by the catchError above */},
          });
        });
      }, delay);
    });
  }

  private cancelScheduledRefresh(): void {
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  /**
   * Re-arm the refresh after a transient failure (network blip, 5xx,
   * cold-starting backend). Short delay so we recover quickly when the
   * server comes back; the next user-driven request will also retry on
   * its own 401, so this is mostly a belt-and-suspenders measure.
   */
  private scheduleRefreshRetry(): void {
    this.cancelScheduledRefresh();
    this.zone.runOutsideAngular(() => {
      this.refreshTimerId = setTimeout(() => {
        this.zone.run(() => {
          if (!this.isLoggedIn()) return;
          this.refreshToken().subscribe({
            error: () => {/* recursive retry handled inside refreshToken */},
          });
        });
      }, REFRESH_RETRY_DELAY_MS);
    });
  }

  /**
   * True only when the failure status proves the refresh token is dead.
   * Status 0 (network/CORS) and 5xx (server fault) are transient — the
   * server never said "your token is bad," it just couldn't be reached.
   */
  private isAuthFatal(err: unknown): boolean {
    const status = (err as { status?: number } | null)?.status ?? 0;
    return AUTH_FATAL_STATUSES.has(status);
  }

  // ────────────────────── visibility / sleep recovery ──────────────────────

  private initVisibilityRecovery(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (!this.isLoggedIn()) return;

      const accessToken = this.getAccessToken();
      const expiresAt = accessToken ? getJwtExpiry(accessToken) : null;
      if (!expiresAt) return;

      // setTimeout is throttled in background tabs — when we come back, the
      // scheduled refresh may already be overdue. Run it now, otherwise just
      // re-arm with the freshly-computed remaining time.
      if (expiresAt - Date.now() <= REFRESH_BUFFER_MS) {
        this.refreshToken().subscribe({ error: () => {} });
      } else {
        this.scheduleProactiveRefresh();
      }
    });

    if (typeof window !== 'undefined') {
      // pageshow fires when the page is restored from bfcache (back/forward
      // navigation) — treat it like visibility coming back.
      window.addEventListener('pageshow', (e) => {
        if (!(e as PageTransitionEvent).persisted) return;
        if (this.isLoggedIn()) this.scheduleProactiveRefresh();
      });

      window.addEventListener('online', () => {
        if (!this.isLoggedIn()) return;
        const accessToken = this.getAccessToken();
        const expiresAt = accessToken ? getJwtExpiry(accessToken) : null;
        if (expiresAt && expiresAt - Date.now() <= REFRESH_BUFFER_MS) {
          this.refreshToken().subscribe({ error: () => {} });
        }
      });
    }
  }

  // ────────────────────── multi-tab sync ──────────────────────

  private initCrossTabSync(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (e) =>
          this.onCrossTabMessage(e.data as CrossTabMessage);
      } catch {
        this.channel = null;
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key !== environment.tokenKey) return;
        this.onCrossTabMessage({
          type: e.newValue ? 'session-updated' : 'logged-out',
        });
      });
    }
  }

  private onCrossTabMessage(msg: CrossTabMessage): void {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'logged-out') {
      this.clearLocalSession();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (msg.type === 'session-updated') {
      // Another tab signed in / refreshed — resync from storage and re-arm.
      this.currentUserSignal.set(this.loadStoredUser());
      this.scheduleProactiveRefresh();
    }
  }

  private broadcast(msg: CrossTabMessage): void {
    try {
      this.channel?.postMessage(msg);
    } catch {
      /* channel closed — ignore */
    }
  }

  // ────────────────────── helpers ──────────────────────

  /**
   * Schedules the "session expired" toast + redirect on a microtask so that
   * the in-flight refresh observable has a chance to error its subscribers
   * first (otherwise the user sees the redirect before the toast).
   */
  private scheduleSessionExpiredLogout(): void {
    if (this.hasScheduledLogoutToast) return;
    this.hasScheduledLogoutToast = true;
    queueMicrotask(() => {
      this.hasScheduledLogoutToast = false;
      this.logout({
        redirect: true,
        callApi: false,
        reason: 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى',
      });
    });
  }

  private makeAuthError(message: string): ApiError {
    return { status: 401, message };
  }
}
