import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { TreasuryService } from '../../services/treasury.service';
import { Shareholder } from '../../models/treasury.model';

@Component({
  selector: 'app-shareholders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe],
  templateUrl: './shareholders.component.html',
  styleUrl: './shareholders.component.scss',
})
export class ShareholdersComponent implements OnInit {
  private readonly svc = inject(TreasuryService);

  protected readonly shareholders = signal<Shareholder[]>([]);

  protected readonly totalCredit  = computed(() => this.shareholders().reduce((s, sh) => s + sh.creditAmount, 0));
  protected readonly totalDebit   = computed(() => this.shareholders().reduce((s, sh) => s + sh.debitAmount,  0));
  protected readonly totalNet     = computed(() => this.totalCredit() - this.totalDebit());

  ngOnInit(): void {
    this.svc.getShareholders().subscribe(list => this.shareholders.set(list));
  }

  protected netBalance(sh: Shareholder): number {
    return sh.creditAmount - sh.debitAmount;
  }
}
