import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { AmountArPipe } from '../../../../../shared/pipes/amount-ar.pipe';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { ProfitTreasuries, ShareholderPendingProfit } from '../../../models/treasury.model';
import { PROFITS_HINTS } from '../../../constants/profits-hints.const';
import { ProfitInfoComponent } from '../profit-info/profit-info.component';
import {
  ProfitShareholdersTableComponent,
  ShareholderColumn,
} from '../profit-shareholders-table/profit-shareholders-table.component';

const SHAREHOLDER_COLUMNS: readonly ShareholderColumn<ShareholderPendingProfit>[] = [
  {
    key: 'accruedProfit',
    label: 'الأرباح المستحقة',
    kind: 'amount',
    field: 'Treasuries.Shareholders.AccruedProfit',
    hint: PROFITS_HINTS.accruedProfit,
  },
  {
    key: 'companyPercentage',
    label: 'نسبة الشركة %',
    kind: 'percent',
    field: 'Treasuries.Shareholders.CompanyPercentage',
    hint: PROFITS_HINTS.companyPercentage,
  },
  {
    key: 'companyShare',
    label: 'حصة الشركة',
    kind: 'amount',
    field: 'Treasuries.Shareholders.CompanyShare',
    hint: PROFITS_HINTS.companyShare,
  },
  {
    key: 'shareholderShare',
    label: 'حصة المساهم',
    kind: 'amount',
    field: 'Treasuries.Shareholders.ShareholderShare',
    hint: PROFITS_HINTS.shareholderShare,
  },
];

/**
 * Green "treasuries" block: fixed balances on the right, one line per
 * representative on the left (any count — the column simply grows).
 * The profits-treasury figure drills down into its per-shareholder split.
 */
@Component({
  selector: 'app-profit-treasuries-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountArPipe, ModalComponent, ProfitInfoComponent, ProfitShareholdersTableComponent],
  templateUrl: './profit-treasuries-card.component.html',
  styleUrl: './profit-treasuries-card.component.scss',
})
export class ProfitTreasuriesCardComponent {
  readonly treasuries = input.required<ProfitTreasuries>();
  /** False when scoped to a single representative — company figures are always 0 then. */
  readonly showCompanyFigures = input(true);

  protected readonly hints = PROFITS_HINTS;
  protected readonly shareholderColumns = SHAREHOLDER_COLUMNS;
  protected readonly detailsOpen = signal(false);
}
