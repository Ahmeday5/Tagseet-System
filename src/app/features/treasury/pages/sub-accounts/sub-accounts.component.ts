import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SubAccountsPanelComponent } from '../../components/sub-accounts-panel/sub-accounts-panel.component';
import { SubAccountVouchersLogComponent } from '../../components/sub-account-vouchers-log/sub-account-vouchers-log.component';
import { SubAccountTransfersLogComponent } from '../../components/sub-account-transfers-log/sub-account-transfers-log.component';

@Component({
  selector: 'app-sub-accounts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SubAccountsPanelComponent,
    SubAccountVouchersLogComponent,
    SubAccountTransfersLogComponent,
  ],
  templateUrl: './sub-accounts.component.html',
})
export class SubAccountsComponent {}
