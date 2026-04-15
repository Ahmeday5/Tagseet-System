import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { WarehouseService } from '../../services/warehouse.service';
import { AlertSeverity, InventoryAlert } from '../../models/warehouse.model';

@Component({
  selector: 'app-inv-alerts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './inv-alerts.component.html',
  styleUrl: './inv-alerts.component.scss',
})
export class InvAlertsComponent implements OnInit {
  private readonly svc   = inject(WarehouseService);
  private readonly toast = inject(ToastService);

  protected readonly alerts = signal<InventoryAlert[]>([]);

  protected readonly outCount      = computed(() => this.alerts().filter(a => a.severity === 'out').length);
  protected readonly criticalCount = computed(() => this.alerts().filter(a => a.severity === 'critical').length);
  protected readonly lowCount      = computed(() => this.alerts().filter(a => a.severity === 'low').length);

  ngOnInit(): void {
    this.svc.getInventoryAlerts().subscribe(a => this.alerts.set(a));
  }

  protected requestOrder(alert: InventoryAlert): void {
    this.toast.success(`تم إنشاء طلب توريد لـ ${alert.name} (${alert.suggestedQty} وحدة)`);
  }

  protected requestTransfer(alert: InventoryAlert): void {
    this.toast.info(`تم طلب تحويل من مخزن ${alert.transferSource} لـ ${alert.name}`);
  }

  protected notifyManager(alert: InventoryAlert): void {
    this.toast.success(`تم إرسال تنبيه WhatsApp للمدير عن ${alert.name}`);
  }

  protected cardClass(severity: AlertSeverity): string {
    const map: Record<AlertSeverity, string> = {
      out:      'inv-alert-card inv-alert-critical',
      critical: 'inv-alert-card inv-alert-low',
      low:      'inv-alert-card inv-alert-low',
      ok:       'inv-alert-card inv-alert-ok',
    };
    return map[severity];
  }
}
