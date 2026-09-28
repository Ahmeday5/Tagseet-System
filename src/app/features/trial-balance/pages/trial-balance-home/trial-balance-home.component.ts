import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, Subject, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/models/api-response.model';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { PrintService } from '../../../../core/services/print.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BalanceSidePanelComponent } from '../../components/balance-side-panel/balance-side-panel.component';
import { BalanceStatusHeroComponent } from '../../components/balance-status-hero/balance-status-hero.component';
import { BalanceCheck } from '../../models/balance-check.model';
import { BalanceView } from '../../models/balance-view.model';
import { BalanceCheckService } from '../../services/balance-check.service';
import { buildBalancePrintConfig } from '../../utils/balance-print.util';
import { buildBalanceView } from '../../utils/balance-view.builder';

type LoadResult =
  | { readonly ok: true; readonly data: BalanceCheck }
  | { readonly ok: false; readonly error: ApiError };

const TIME_FORMAT = new Intl.DateTimeFormat('ar-EG', {
  hour: 'numeric',
  minute: '2-digit',
});

const FALLBACK_ERROR = 'تعذّر تحميل ميزان المراجعة، حاول مرة أخرى';

@Component({
  selector: 'app-trial-balance-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BalanceStatusHeroComponent, BalanceSidePanelComponent],
  templateUrl: './trial-balance-home.component.html',
  styleUrl: './trial-balance-home.component.scss',
})
export class TrialBalanceHomeComponent implements OnInit {
  private readonly service = inject(BalanceCheckService);
  private readonly cache = inject(HttpCacheService);
  private readonly printer = inject(PrintService);
  private readonly toast = inject(ToastService);

  private readonly reload$ = new Subject<void>();

  private readonly data = signal<BalanceCheck | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly lastUpdated = signal<Date | null>(null);

  protected readonly view = computed<BalanceView | null>(() => {
    const dto = this.data();
    return dto ? buildBalanceView(dto) : null;
  });

  protected readonly isForbidden = computed(() => this.error()?.status === 403);
  protected readonly errorText = computed(() => this.error()?.message || FALLBACK_ERROR);
  protected readonly isInitialLoad = computed(() => this.loading() && !this.data());
  protected readonly lastUpdatedText = computed(() => {
    const at = this.lastUpdated();
    return at ? TIME_FORMAT.format(at) : '';
  });

  constructor() {
    // switchMap drops a stale in-flight request when a newer refresh starts.
    this.reload$
      .pipe(
        switchMap(() =>
          this.service.get().pipe(
            map((data): LoadResult => ({ ok: true, data })),
            catchError((error: ApiError) => of<LoadResult>({ ok: false, error })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.applyResult(result));

    // Almost every mutation in the app moves one side of the balance, so
    // any cache invalidation is a signal to re-check while the page is open.
    // The signal replays its last event on subscribe, so anything that
    // happened before this page mounted is ignored (ngOnInit loads fresh).
    const mountedAfter = this.cache.invalidations().ts;
    effect(
      () => {
        const event = this.cache.invalidations();
        if (!event.patterns.length || event.ts <= mountedAfter) return;
        untracked(() => this.reload());
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.reload$.next();
  }

  protected print(): void {
    const view = this.view();
    if (!view) return;
    this.printer.print(buildBalancePrintConfig(view));
  }

  private applyResult(result: LoadResult): void {
    this.loading.set(false);

    if (result.ok) {
      this.data.set(result.data);
      this.error.set(null);
      this.lastUpdated.set(new Date());
      return;
    }

    // A failed refresh keeps the last good snapshot on screen; only a
    // failed first load (or a permission denial) replaces the page.
    if (this.data() && result.error.status !== 403) {
      this.toast.error(result.error.message || FALLBACK_ERROR);
      return;
    }
    this.data.set(null);
    this.error.set(result.error);
  }
}
