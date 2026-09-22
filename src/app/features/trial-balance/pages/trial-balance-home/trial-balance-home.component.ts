import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UnderConstructionComponent } from '../../../../shared/components/under-construction/under-construction.component';

@Component({
  selector: 'app-trial-balance-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UnderConstructionComponent],
  templateUrl: './trial-balance-home.component.html',
})
export class TrialBalanceHomeComponent {}
