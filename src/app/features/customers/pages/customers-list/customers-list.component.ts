import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { CustomersService } from '../../services/customers.service';
import {
  DashboardClient,
  DashboardClientRating,
  DashboardClientStatus,
} from '../../models/dashboard-client.model';
import { CustomerFormComponent } from '../../components/customer-form/customer-form.component';
import { BadgeComponent, BadgeType } from '../../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Installments clients index — server-paginated against
 * `GET /dashboard/clients`.
 *
 *   - debounced search (name / phone / address)
 *   - "overdue only" toggle (`onlyOverdue=true` query)
 *   - server-side pagination via `<app-pagination>`
 *   - quick-create modal stays on top of the legacy mock service for now;
 *     a successful save triggers a force-refresh of the live list
 */
@Component({
  selector: 'app-customers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BadgeComponent,
    PaginationComponent,
    CurrencyArPipe,
    CustomerFormComponent,
  ],
  templateUrl: './customers-list.component.html',
  styleUrl: './customers-list.component.scss',
})
export class CustomersListComponent {
  private readonly service = inject(CustomersService);
  private readonly toast   = inject(ToastService);
  private readonly cache   = inject(HttpCacheService);

  // ── data ──
  protected readonly clients             = signal<DashboardClient[]>([]);
  protected readonly overdueClientsCount = signal(0);
  protected readonly loading             = signal(false);

  // ── filters ──
  protected readonly searchTerm  = signal('');
  protected readonly onlyOverdue = signal(false);
  protected readonly pageIndex   = signal(1);
  protected readonly pageSize    = signal(DEFAULT_PAGE_SIZE);

  // ── server pagination meta ──
  protected readonly count      = signal(0);
  protected readonly totalPages = signal(0);

  // ── modal ──
  protected readonly showForm = signal(false);

  // ── derived ──
  protected readonly hasFilters = computed(
    () => this.searchTerm().length > 0 || this.onlyOverdue(),
  );

  // Single observed tuple; any change triggers a debounced refetch.
  private readonly fetchTrigger = computed(() => ({
    search: this.searchTerm().trim(),
    onlyOverdue: this.onlyOverdue(),
    pageIndex: this.pageIndex(),
    pageSize: this.pageSize(),
  }));

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const trigger = this.fetchTrigger();
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(
        () => this.fetch(trigger),
        SEARCH_DEBOUNCE_MS,
      );
    });

    // Refetch whenever any client-related cache key is invalidated
    // (e.g. another tab recorded a payment).
    onInvalidate(this.cache, 'client', () => this.refresh());
  }

  // ─────────── data loaders ───────────

  private fetch(
    trigger: {
      search: string;
      onlyOverdue: boolean;
      pageIndex: number;
      pageSize: number;
    },
    force = false,
  ): void {
    this.loading.set(true);
    const stream$ = force
      ? this.service.refreshDashboard(trigger)
      : this.service.listDashboard(trigger);

    stream$.subscribe({
      next: (res) => {
        const page = res?.clients;
        this.clients.set(page?.data ?? []);
        this.count.set(page?.count ?? 0);
        this.totalPages.set(page?.totalPages ?? 0);
        this.overdueClientsCount.set(res?.overdueClientsCount ?? 0);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.clients.set([]);
        this.count.set(0);
        this.totalPages.set(0);
        this.overdueClientsCount.set(0);
        this.loading.set(false);
        this.toast.error(err?.message || 'تعذّر تحميل العملاء');
      },
    });
  }

  protected refresh(): void {
    this.fetch(this.fetchTrigger(), true);
  }

  // ─────────── filter handlers ───────────

  protected onSearch(value: string): void {
    this.searchTerm.set(value);
    if (this.pageIndex() !== 1) this.pageIndex.set(1);
  }

  protected clearSearch(): void {
    if (!this.searchTerm()) return;
    this.searchTerm.set('');
    this.pageIndex.set(1);
  }

  protected toggleOnlyOverdue(value: boolean): void {
    this.onlyOverdue.set(value);
    if (this.pageIndex() !== 1) this.pageIndex.set(1);
  }

  protected onPageChange(page: number): void {
    this.pageIndex.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
  }

  // ─────────── modal ───────────

  protected onSaved(): void {
    this.showForm.set(false);
    if (this.pageIndex() !== 1) this.pageIndex.set(1);
    else this.refresh();
  }

  // ─────────── view helpers ───────────

  protected statusLabel(status: DashboardClientStatus): string {
    const map: Record<DashboardClientStatus, string> = {
      New:             'جديد',
      OnTrack:         'منتظم',
      OneOverdue:      'متأخر قسط',
      MultipleOverdue: 'متأخر',
    };
    return map[status] ?? status;
  }

  protected statusBadge(status: DashboardClientStatus): BadgeType {
    const map: Record<DashboardClientStatus, BadgeType> = {
      New:             'info',
      OnTrack:         'ok',
      OneOverdue:      'warn',
      MultipleOverdue: 'bad',
    };
    return map[status] ?? 'info';
  }

  protected ratingLabel(rating: DashboardClientRating): string {
    const map: Record<DashboardClientRating, string> = {
      A: 'ممتاز', B: 'جيد', C: 'متوسط', D: 'ضعيف',
    };
    return map[rating];
  }

  protected paymentFrequencyLabel(freq: string | null): string {
    if (!freq) return '—';
    const map: Record<string, string> = {
      Monthly:     'شهري',
      Weekly:      'أسبوعي',
      Quarterly:   'ربع سنوي',
      SemiAnnual:  'نصف سنوي',
      SemiAnnually:'نصف سنوي',
      Annual:      'سنوي',
      Annually:    'سنوي',
    };
    return map[freq] ?? freq;
  }

  /** Parse "3/12" → 25 (% complete). Returns 0 when shape is unexpected. */
  protected progressPercent(progress: string | null): number {
    if (!progress) return 0;
    const [paid, total] = progress.split('/').map((n) => Number(n));
    if (!Number.isFinite(paid) || !Number.isFinite(total) || total <= 0) return 0;
    return Math.min(100, Math.round((paid / total) * 100));
  }

  protected progressColor(status: DashboardClientStatus): string {
    const map: Record<DashboardClientStatus, string> = {
      New:             'var(--bl)',
      OnTrack:         'var(--gr)',
      OneOverdue:      'var(--am)',
      MultipleOverdue: 'var(--re)',
    };
    return map[status] ?? 'var(--bl)';
  }
}
