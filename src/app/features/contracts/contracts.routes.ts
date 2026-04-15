import { Routes } from '@angular/router';

export const contractsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/contracts-home/contracts-home.component').then(
        (m) => m.ContractsHomeComponent
      ),
  },
];
