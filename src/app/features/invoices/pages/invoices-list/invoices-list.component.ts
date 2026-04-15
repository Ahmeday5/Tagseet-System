import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { InvoicesService } from '../../services/invoices.service';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe, DateArPipe, BadgeComponent],
  templateUrl: './invoices-list.component.html',
  styleUrl: './invoices-list.component.scss',
})
export class InvoicesListComponent implements OnInit {
  private readonly svc = inject(InvoicesService);

  protected readonly allInvoices  = signal<Invoice[]>([]);
  protected readonly searchQuery  = signal('');
  protected readonly statusFilter = signal<InvoiceStatus | ''>('');

  protected readonly invoices = computed(() => {
    const q   = this.searchQuery().trim().toLowerCase();
    const st  = this.statusFilter();
    return this.allInvoices().filter(inv => {
      const matchQ  = !q  || inv.invoiceNumber.toLowerCase().includes(q) || inv.supplierName.toLowerCase().includes(q);
      const matchSt = !st || inv.status === st;
      return matchQ && matchSt;
    });
  });

  protected readonly totalAmount    = computed(() => this.allInvoices().reduce((s, i) => s + i.total,     0));
  protected readonly totalPaid      = computed(() => this.allInvoices().reduce((s, i) => s + i.paid,      0));
  protected readonly totalRemaining = computed(() => this.allInvoices().reduce((s, i) => s + i.remaining, 0));
  protected readonly unpaidCount    = computed(() => this.allInvoices().filter(i => i.status !== 'paid').length);

  ngOnInit(): void {
    this.svc.getAll().subscribe(r => this.allInvoices.set(r));
  }

  protected getStatusLabel(s: InvoiceStatus): string {
    const map: Record<InvoiceStatus, string> = { paid: 'مدفوع', partial: 'جزئي', unpaid: 'غير مدفوع' };
    return map[s];
  }

  protected getStatusBadge(s: InvoiceStatus): 'ok' | 'warn' | 'bad' {
    const map: Record<InvoiceStatus, 'ok' | 'warn' | 'bad'> = { paid: 'ok', partial: 'warn', unpaid: 'bad' };
    return map[s];
  }
}
