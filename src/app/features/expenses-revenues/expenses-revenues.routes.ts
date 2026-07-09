import { Routes } from '@angular/router';

export const expensesRevenuesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/expenses-revenues-home/expenses-revenues-home.component').then(
        (m) => m.ExpensesRevenuesHomeComponent,
      ),
  },
];
