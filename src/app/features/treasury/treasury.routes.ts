import { Routes } from '@angular/router';
import { denyRolesGuard } from '../../core/guards/role.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions.const';

export const treasuryRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/treasury-home/treasury-home.component').then(
        (m) => m.TreasuryHomeComponent
      ),
  },
  {
    path: 'monthly-profits',
    loadComponent: () =>
      import('./pages/monthly-profits/monthly-profits.component').then(
        (m) => m.MonthlyProfitsComponent
      ),
  },
  {
    path: 'sub-accounts',
    canActivate: [
      permissionGuard(
        [PERMISSIONS.subAccountsView, PERMISSIONS.subAccountsFullAccess],
        { mode: 'any' },
      ),
    ],
    loadComponent: () =>
      import('./pages/sub-accounts/sub-accounts.component').then(
        (m) => m.SubAccountsComponent
      ),
  },
  {
    // Off-limits to Representatives even if the backend grants them
    // Treasury.View — shareholders is owners-only.
    path: 'shareholders',
    canActivate: [denyRolesGuard(['Representative'])],
    loadComponent: () =>
      import('./pages/shareholders/shareholders.component').then(
        (m) => m.ShareholdersComponent
      ),
  },
];
