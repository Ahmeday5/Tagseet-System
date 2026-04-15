import { Routes } from '@angular/router';

export const treasuryRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/treasury-home/treasury-home.component').then(
        (m) => m.TreasuryHomeComponent
      ),
  },
  {
    path: 'shareholders',
    loadComponent: () =>
      import('./pages/shareholders/shareholders.component').then(
        (m) => m.ShareholdersComponent
      ),
  },
];
