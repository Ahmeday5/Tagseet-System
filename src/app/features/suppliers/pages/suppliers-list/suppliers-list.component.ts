import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { SuppliersService } from '../../services/suppliers.service';
import { Supplier, SupplierStatus } from '../../models/supplier.model';

@Component({
  selector: 'app-suppliers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe, BadgeComponent],
  templateUrl: './suppliers-list.component.html',
  styleUrl: './suppliers-list.component.scss',
})
export class SuppliersListComponent implements OnInit {
  private readonly suppliersService = inject(SuppliersService);

  protected readonly suppliers = signal<Supplier[]>([]);

  ngOnInit(): void {
    this.suppliersService.getAll().subscribe((suppliers) => this.suppliers.set(suppliers));
  }

  protected getStatusLabel(status: SupplierStatus): string {
    const labels: Record<SupplierStatus, string> = { active: 'نشط', inactive: 'غير نشط' };
    return labels[status];
  }

  protected getStatusBadge(status: SupplierStatus): 'ok' | 'bad' {
    return status === 'active' ? 'ok' : 'bad';
  }
}
