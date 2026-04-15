import {
  ChangeDetectionStrategy, Component, inject, OnInit, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CustomersService } from '../../services/customers.service';
import { Customer, RescheduleRequest } from '../../models/customer.model';
import { BadgeComponent, BadgeType } from '../../../../shared/components/badge/badge.component';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-reschedule',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, BadgeComponent],
  templateUrl: './reschedule.component.html',
  styleUrl: './reschedule.component.scss',
})
export class RescheduleComponent implements OnInit {
  private readonly svc   = inject(CustomersService);
  private readonly toast = inject(ToastService);

  protected readonly customers          = signal<Customer[]>([]);
  protected readonly rescheduleRequests = signal<RescheduleRequest[]>([]);

  ngOnInit(): void {
    this.svc.getAll({ limit: 100 }).subscribe(r => this.customers.set(r.data));
    this.svc.getRescheduleRequests().subscribe(r => this.rescheduleRequests.set(r));
  }

  protected submit(): void {
    this.toast.success('تم إرسال طلب إعادة الجدولة للمدير');
  }

  protected getStatusLabel(s: RescheduleRequest['status']): string {
    const map: Record<RescheduleRequest['status'], string> = { accepted: 'مقبول', pending: 'جاري', rejected: 'مرفوض' };
    return map[s];
  }

  protected getStatusBadge(s: RescheduleRequest['status']): BadgeType {
    const map: Record<RescheduleRequest['status'], BadgeType> = { accepted: 'ok', pending: 'warn', rejected: 'bad' };
    return map[s];
  }
}
