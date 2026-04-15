import {
  ChangeDetectionStrategy, Component, inject, OnInit, signal,
} from '@angular/core';

import { CustomersService } from '../../services/customers.service';
import { CreditRatingItem, CreditScore } from '../../models/customer.model';
import { BadgeComponent, BadgeType } from '../../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-credit-rating',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  templateUrl: './credit-rating.component.html',
  styleUrl: './credit-rating.component.scss',
})
export class CreditRatingComponent implements OnInit {
  private readonly svc = inject(CustomersService);

  protected readonly ratings = signal<CreditRatingItem[]>([]);

  ngOnInit(): void {
    this.svc.getCreditRatings().subscribe(r => this.ratings.set(r));
  }

  protected getBadge(s: CreditScore): BadgeType {
    const map: Record<CreditScore, BadgeType> = { A: 'ok', B: 'info', C: 'warn', D: 'bad' };
    return map[s];
  }

  protected getDelayColor(days: number): string {
    if (days === 0)  return 'var(--gr)';
    if (days <= 7)   return 'var(--am)';
    return 'var(--re)';
  }

  protected getCommitmentColor(rate: number): string {
    if (rate >= 90) return 'var(--gr)';
    if (rate >= 70) return 'var(--bl)';
    if (rate >= 50) return 'var(--am)';
    return 'var(--re)';
  }
}
