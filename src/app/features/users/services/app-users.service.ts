import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  AppUser,
  AppUserMutationResult,
  CreateAppUserPayload,
  RoleOption,
  UpdateAppUserPayload,
} from '../models/app-user.model';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';

/** All cached URLs containing this token are dropped on any users mutation. */
const APP_USERS_CACHE_KEY = 'app-users';

/** Roles practically never change inside a session. */
const ROLES_TTL_MS = 60 * 60 * 1000; // 1 hour
const USERS_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * App-users CRUD + role catalogue.
 *
 * Caching strategy
 * ────────────────
 *   - Reads (`list`, `getById`, `getRoles`) opt into the HTTP cache via
 *     `withCache()`. The interceptor handles persistence + cross-tab sync.
 *   - Mutations (`create`, `update`, `delete`) flag `app-users` for
 *     invalidation. The interceptor drops the list URL AND any per-id URL
 *     that contains that segment, on success only.
 *   - `refresh*()` helpers force-bypass the cache for explicit refresh buttons.
 */
@Injectable({ providedIn: 'root' })
export class AppUsersService {
  private readonly api = inject(ApiService);

  // ─────────────── reads (cached) ───────────────

  list(): Observable<AppUser[]> {
    return this.api.get<AppUser[]>(API_ENDPOINTS.appUsers.base, {
      context: withCache({ ttlMs: USERS_TTL_MS }),
    });
  }

  /** Force-refresh the list, bypassing any cached entry. */
  refreshList(): Observable<AppUser[]> {
    return this.api.get<AppUser[]>(API_ENDPOINTS.appUsers.base, {
      context: withCacheBypass(withCache({ ttlMs: USERS_TTL_MS })),
    });
  }

  getById(id: string): Observable<AppUser> {
    return this.api.get<AppUser>(API_ENDPOINTS.appUsers.byId(id), {
      context: withCache({ ttlMs: USERS_TTL_MS }),
    });
  }

  getRoles(): Observable<RoleOption[]> {
    return this.api.get<RoleOption[]>(API_ENDPOINTS.appUsers.roles, {
      context: withCache({ ttlMs: ROLES_TTL_MS }),
    });
  }

  /** Force-refresh roles (e.g. after admin adds a new role server-side). */
  refreshRoles(): Observable<RoleOption[]> {
    return this.api.get<RoleOption[]>(API_ENDPOINTS.appUsers.roles, {
      context: withCacheBypass(withCache({ ttlMs: ROLES_TTL_MS })),
    });
  }

  // ─────────────── mutations (invalidate) ───────────────

  create(payload: CreateAppUserPayload): Observable<AppUserMutationResult> {
    return this.api.post<AppUserMutationResult>(
      API_ENDPOINTS.appUsers.base,
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([APP_USERS_CACHE_KEY]),
        ),
      },
    );
  }

  update(
    id: string,
    payload: UpdateAppUserPayload,
  ): Observable<AppUserMutationResult> {
    return this.api.put<AppUserMutationResult>(
      API_ENDPOINTS.appUsers.byId(id),
      payload,
      {
        context: withInlineHandling(
          withCacheInvalidate([APP_USERS_CACHE_KEY]),
        ),
      },
    );
  }

  delete(id: string): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      API_ENDPOINTS.appUsers.byId(id),
      {
        context: withCacheInvalidate([APP_USERS_CACHE_KEY]),
      },
    );
  }

  // ─────────────── helpers ───────────────

  /** Lookup an Arabic label for a role id from a cached role catalogue. */
  resolveRoleLabel(roleId: string, roles: RoleOption[]): string {
    return roles.find((r) => r.id === roleId)?.nameAr ?? roleId;
  }
}
