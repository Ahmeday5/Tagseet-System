import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AmountArPipe } from '../../../../../shared/pipes/amount-ar.pipe';
import { ProfitsSummary } from '../../../models/treasury.model';
import { PROFITS_HINTS } from '../../../constants/profits-hints.const';
import { ProfitInfoComponent } from '../profit-info/profit-info.component';

/**
 * "الأرباح" block — the year's net-profit equation plus total/current
 * profits. "= الأرباح الموزعة" only holds company-wide, so it's dropped from
 * the equation when scoped to a representative.
 */
@Component({
  selector: 'app-profits-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountArPipe, NgTemplateOutlet, ProfitInfoComponent],
  templateUrl: './profits-summary-card.component.html',
  styleUrl: './profits-summary-card.component.scss',
})
export class ProfitsSummaryCardComponent {
  readonly summary = input.required<ProfitsSummary>();
  readonly showCompanyFigures = input(true);

  protected readonly hints = PROFITS_HINTS;
}
