import { Routes } from '@angular/router';

export const invoicesRoutes: Routes = [
  // Tabbed shell hosts the list + new-invoice tabs.
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

  // Standalone details / preview page — sibling of the shell so the print
  // view doesn't carry the list/new chrome.
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/invoice-details/invoice-details.component').then(
        (m) => m.InvoiceDetailsComponent,
      ),
  },
];
