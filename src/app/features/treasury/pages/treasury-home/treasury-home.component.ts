import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TreasuryService } from '../../services/treasury.service';
import { TreasuryTransaction, TreasurySummary } from '../../models/treasury.model';

@Component({
  selector: 'app-treasury-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './treasury-home.component.html',
  styleUrl: './treasury-home.component.scss',
})
export class TreasuryHomeComponent implements OnInit {
  private readonly treasuryService = inject(TreasuryService);

  protected readonly summary      = signal<TreasurySummary | null>(null);
  protected readonly transactions = signal<TreasuryTransaction[]>([]);

  ngOnInit(): void {
    this.treasuryService.getData().subscribe(({ summary, transactions }) => {
      this.summary.set(summary);
      this.transactions.set(transactions);
    });
  }
}
