import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AmountArPipe } from '../../../../../shared/pipes/amount-ar.pipe';
import { ProfitsSummary } from '../../../models/treasury.model';
import { PROFITS_HINTS } from '../../../constants/profits-hints.const';

/** "الأرباح" block — total / distributed / current profits for the year. */
@Component({
  selector: 'app-profits-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountArPipe],
  templateUrl: './profits-summary-card.component.html',
  styleUrl: './profits-summary-card.component.scss',
})
export class ProfitsSummaryCardComponent {
  readonly summary = input.required<ProfitsSummary>();

  protected readonly hints = PROFITS_HINTS;
}
