import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // Auth area — only reachable when NOT signed in
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layouts/auth/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // Authenticated app shell
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layouts/admin/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(
            (m) => m.dashboardRoutes,
          ),
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('./features/customers/customers.routes').then(
            (m) => m.customersRoutes,
          ),
      },
      {
        path: 'catalog',
        loadChildren: () =>
          import('./features/catalog/catalog.routes').then(
            (m) => m.catalogRoutes,
          ),
      },
      {
        path: 'suppliers',
        loadChildren: () =>
          import('./features/suppliers/suppliers.routes').then(
            (m) => m.suppliersRoutes,
          ),
      },
      {
        path: 'invoices',
        loadChildren: () =>
          import('./features/invoices/invoices.routes').then(
            (m) => m.invoicesRoutes,
          ),
      },
      {
        path: 'warehouse',
        loadChildren: () =>
          import('./features/warehouse/warehouse.routes').then(
            (m) => m.warehouseRoutes,
          ),
      },
      {
        path: 'products',
        loadChildren: () =>
          import('./features/products/products.routes').then(
            (m) => m.productsRoutes,
          ),
      },
      {
        path: 'treasury',
        loadChildren: () =>
          import('./features/treasury/treasury.routes').then(
            (m) => m.treasuryRoutes,
          ),
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./features/users/users.routes').then((m) => m.usersRoutes),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then(
            (m) => m.reportsRoutes,
          ),
      },
      {
        path: 'audit',
        loadChildren: () =>
          import('./features/audit/audit.routes').then((m) => m.auditRoutes),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./features/notifications/notifications.routes').then(
            (m) => m.notificationsRoutes,
          ),
      },
      {
        path: 'contracts',
        loadChildren: () =>
          import('./features/contracts/contracts.routes').then(
            (m) => m.contractsRoutes,
          ),
      },
      {
        path: 'reps',
        loadChildren: () =>
          import('./features/reps/reps.routes').then((m) => m.repsRoutes),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  
  { path: '**', redirectTo: '/dashboard' },
];
