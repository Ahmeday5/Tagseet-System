/**
 * Single source of truth for backend endpoints.
 *
 * Paths are relative to `environment.apiUrl` (the ApiService prepends the
 * base and strips any leading slash so both forms work).
 */
export const API_ENDPOINTS = {
  auth: {
    login: 'dashboard/auth/login',
    logout: 'auth/logout',
    refresh: 'auth/refresh-token',
    me: 'dashboard/auth/me',
  },
  appUsers: {
    base: 'dashboard/app-users',
    byId: (id: string) => `dashboard/app-users/${encodeURIComponent(id)}`,
    roles: 'dashboard/app-users/roles',
  },
  treasuries: {
    base: 'dashboard/treasuries',
    byId: (id: number) => `dashboard/treasuries/${id}`,
  },
  warehouses: {
    base: 'dashboard/warehouses',
    byId: (id: number) => `dashboard/warehouses/${id}`,
  },
  products: {
    base: 'dashboard/products',
    byId: (id: number) => `dashboard/products/${id}`,
  },
  dashboard: {
    summary: 'dashboard/summary',
  },
} as const;
