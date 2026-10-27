import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AmountArPipe } from '../../../../../shared/pipes/amount-ar.pipe';
import { ProfitTreasuries } from '../../../models/treasury.model';
import { PROFITS_HINTS } from '../../../constants/profits-hints.const';

/**
 * Green "treasuries" block: fixed balances on the right, one line per
 * representative on the left (any count — the column simply grows).
 */
@Component({
  selector: 'app-profit-treasuries-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountArPipe],
  templateUrl: './profit-treasuries-card.component.html',
  styleUrl: './profit-treasuries-card.component.scss',
})
export class ProfitTreasuriesCardComponent {
  readonly treasuries = input.required<ProfitTreasuries>();
  /** False when scoped to a single representative — company figures are always 0 then. */
  readonly showCompanyFigures = input(true);

  protected readonly hints = PROFITS_HINTS;
}
