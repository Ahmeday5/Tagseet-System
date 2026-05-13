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
    summary: 'dashboard/warehouses/summary',
    inventory: 'dashboard/warehouses/inventory',
  },
  products: {
    base: 'dashboard/products',
    byId: (id: number) => `dashboard/products/${id}`,
  },
  categories: {
    base: 'dashboard/categories',
    byId: (id: number) => `dashboard/categories/${id}`,
  },
  suppliers: {
    base: 'dashboard/suppliers',
    byId: (id: number) => `dashboard/suppliers/${id}`,
    statement: (id: number) => `dashboard/suppliers/${id}/statement`,
  },
  purchaseInvoices: {
    base: 'dashboard/supplier-purchase-invoices',
    byId: (id: number) => `dashboard/supplier-purchase-invoices/${id}`,
    summary: 'dashboard/supplier-purchase-invoices/summary',
    confirm: (id: number) =>
      `dashboard/supplier-purchase-invoices/${id}/confirm`,
  },
  dashboard: {
    summary: 'dashboard/summary',
    homeSummary: 'dashboard/home-summary',
  },
  charts: {
    profitsLast6Months: 'dashboard/charts/profits-last-6-months',
  },
  installments: {
    dueThisWeek: 'dashboard/installments/due-this-week',
    /**
     * Records a payment against an open installment contract.
     * Note: this endpoint is mounted at the API root (no /dashboard prefix).
     */
    pay: 'installments/pay',
  },
  clientOrders: {
    base: 'dashboard/client-orders',
    reject: (id: number) => `dashboard/client-orders/${id}/reject`,
    convertToContract: (id: number) =>
      `dashboard/client-orders/${id}/convert-to-contract`,
  },
  clients: {
    base: 'dashboard/clients',
    byId: (id: number) => `dashboard/clients/${id}`,
    topThisMonth: 'dashboard/clients/top-this-month',
    contracts: (id: number) => `dashboard/clients/${id}/contracts`,
  },
  inventory: {
    alerts: 'dashboard/inventory/alerts',
  },
  financial: {
    separation: 'dashboard/financial-separation',
  },
  representatives: {
    base: 'dashboard/representatives',
    byId: (id: number) => `dashboard/representatives/${id}`,
  },
  contracts: {
    base: 'dashboard/contracts',
    details: (id: number) => `dashboard/contracts/${id}/details`,
  },
} as const;
