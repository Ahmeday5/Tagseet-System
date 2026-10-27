import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, map, merge, of, Subject, switchMap, tap } from 'rxjs';
import { TreasuryService } from '../../services/treasury.service';
import { RepsService } from '../../../reps/services/reps.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';
import { ApiError } from '../../../../core/models/api-response.model';
import {
  ProfitsScreen,
  ProfitsScreenQuery,
} from '../../models/treasury.model';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { ProfitTreasuriesCardComponent } from '../../components/profits/profit-treasuries-card/profit-treasuries-card.component';
import { ProfitsSummaryCardComponent } from '../../components/profits/profits-summary-card/profits-summary-card.component';
import { MonthlySalesProfitsTableComponent } from '../../components/profits/monthly-sales-profits-table/monthly-sales-profits-table.component';
import { MonthlyProfitDistributionTableComponent } from '../../components/profits/monthly-profit-distribution-table/monthly-profit-distribution-table.component';

/** How many years (ending with the current one) the year picker offers. */
const YEAR_SPAN = 6;
const FORBIDDEN_MESSAGE = 'غير مصرح لك بعرض هذه البيانات';

/**
 * Profits screen. Thin container: owns the filters and the single fetch,
 * then hands each slice of the payload to a presentational block.
 *
 * Representatives are locked to their own data server-side, so the
 * representative filter is hidden and `representativeId` is never sent
 * for them (the backend answers 403 otherwise).
 */
@Component({
  selector: 'app-monthly-profits',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    SearchableSelectComponent,
    ProfitTreasuriesCardComponent,
    ProfitsSummaryCardComponent,
    MonthlySalesProfitsTableComponent,
    MonthlyProfitDistributionTableComponent,
  ],
  templateUrl: './monthly-profits.component.html',
  styleUrl: './monthly-profits.component.scss',
})
export class MonthlyProfitsComponent implements OnInit {
  private readonly treasuryService = inject(TreasuryService);
  private readonly repsService = inject(RepsService);
  private readonly auth = inject(AuthService);
  private readonly cache = inject(HttpCacheService);

  protected readonly isRepresentative = computed(
    () => this.auth.currentUser()?.role === 'Representative',
  );

  // ── filters ──
  protected readonly yearOptions = Array.from(
    { length: YEAR_SPAN },
    (_, i) => new Date().getFullYear() - i,
  );
  protected readonly year = signal(this.yearOptions[0]);
  protected readonly representativeId = signal<number | null>(null);
  protected readonly repOptions = signal<SearchableSelectOption[]>([]);
  protected readonly repOptionsLoading = signal(false);

  // ── data ──
  protected readonly screen = signal<ProfitsScreen | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Company-level figures are always 0 when the data is scoped to a single
   * representative (own account or admin filter), so they're hidden then.
   */
  protected readonly showCompanyFigures = computed(
    () => !this.isRepresentative() && this.representativeId() === null,
  );

  private readonly query = computed<ProfitsScreenQuery>(() => ({
    year: this.year(),
    representativeId: this.isRepresentative()
      ? undefined
      : (this.representativeId() ?? undefined),
  }));

  /** Explicit refresh / retry / cache invalidation — always hits the server. */
  private readonly reload$ = new Subject<void>();

  constructor() {
    merge(
      toObservable(this.query).pipe(map((query) => ({ query, bypass: false }))),
      this.reload$.pipe(
        map(() => ({ query: untracked(this.query), bypass: true })),
      ),
    )
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.errorMessage.set(null);
        }),
        // switchMap drops stale responses when filters change mid-flight.
        switchMap(({ query, bypass }) =>
          this.treasuryService.profitsScreen(query, bypass).pipe(
            map((data) => ({ data, error: null })),
            catchError((error: ApiError) => of({ data: null, error })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ data, error }) => {
        this.screen.set(data);
        this.errorMessage.set(error ? this.toMessage(error) : null);
        this.loading.set(false);
      });

    onInvalidate(this.cache, 'treasur', () => this.reload());
  }

  ngOnInit(): void {
    if (!this.isRepresentative()) this.loadRepresentatives();
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected onYearChange(year: number): void {
    this.year.set(Number(year));
  }

  protected onRepresentativeChange(id: number | string | null): void {
    this.representativeId.set(id === null || id === '' ? null : Number(id));
  }

  private loadRepresentatives(): void {
    this.repOptionsLoading.set(true);
    this.repsService.lookup().subscribe({
      next: (reps) => {
        this.repOptions.set(reps.map((r) => ({ value: r.id, label: r.name })));
        this.repOptionsLoading.set(false);
      },
      error: () => this.repOptionsLoading.set(false),
    });
  }

  private toMessage(error: ApiError): string {
    return error.status === 403 ? FORBIDDEN_MESSAGE : error.message;
  }
}
