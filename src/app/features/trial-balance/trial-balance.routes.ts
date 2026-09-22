import { Routes } from '@angular/router';

export const trialBalanceRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/trial-balance-home/trial-balance-home.component').then(
        (m) => m.TrialBalanceHomeComponent,
      ),
  },
];
