import { Routes } from '@angular/router';

export const invoicesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/invoices-shell/invoices-shell.component').then(
        (m) => m.InvoicesShellComponent,
      ),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () =>
          import('./pages/invoices-list/invoices-list.component').then(
            (m) => m.InvoicesListComponent,
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/invoice-new/invoice-new.component').then(
            (m) => m.InvoiceNewComponent,
          ),
      },
    ],
  },
];
