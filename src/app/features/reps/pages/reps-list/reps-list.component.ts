import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';
import { ApiError } from '../../../../core/models/api-response.model';
import { FormMode } from '../../../../shared/models/form-mode.model';
import { RepsService } from '../../services/reps.service';
import {
  Representative,
  RepresentativePermission,
  RepresentativeStatus,
} from '../../models/rep.model';
import { RepFormModalComponent } from '../../components/rep-form-modal/rep-form-modal.component';
import {
  REP_PERMISSION_BADGE,
  REP_PERMISSION_LABELS,
  REP_STATUS_BADGE,
  REP_STATUS_LABELS,
} from '../../constants/rep-meta';
import { BadgeType } from '../../../../shared/components/badge/badge.component';

const DEFAULT_PAGE_SIZE = 10;

@Component({
  selector: 'app-reps-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyArPipe,
    BadgeComponent,
    PaginationComponent,
    RepFormModalComponent,
  ],
  templateUrl: './reps-list.component.html',
  styleUrl: './reps-list.component.scss',
})
export class RepsListComponent implements OnInit {
  private readonly service = inject(RepsService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly cache = inject(HttpCacheService);

  // ── data ──
  protected readonly reps = signal<Representative[]>([]);
  protected readonly loading = signal(false);

  // ── filters ──
  protected readonly searchTerm = signal('');
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  // ── pagination meta from server ──
  protected readonly count = signal(0);
  protected readonly totalPages = signal(0);

  // ── modal state ──
  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<FormMode>('create');
  protected readonly modalRep = signal<Representative | null>(null);

  /** Tracks which row is currently being deleted, for inline button state. */
  protected readonly deletingId = signal<number | null>(null);

  // ── derived ──
  protected readonly hasReps = computed(() => this.reps().length > 0);
  protected readonly hasFilters = computed(
    () => this.searchTerm().trim().length > 0,
  );
  protected readonly activeCount = computed(
    () => this.reps().filter((r) => r.status === 'Active').length,
  );

  /**
   * Sum of all sub-treasury balances on the current page. Surfaces
   * "money sitting with reps" without needing a dedicated endpoint.
   */
  protected readonly totalTreasuryBalance = computed(() =>
    this.reps().reduce((sum, r) => sum + (r.treasury?.currentBalance ?? 0), 0),
  );

  /** Weighted average performance rating across the page (0..5). */
  protected readonly avgPerformance = computed(() => {
    const list = this.reps();
    if (list.length === 0) return 0;
    const total = list.reduce((s, r) => s + (r.performanceRating ?? 0), 0);
    return total / list.length;
  });

  // ── debounce machinery ──
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly fetchTrigger = computed(() => ({
    search: this.searchTerm().trim(),
    pageIndex: this.pageIndex(),
    pageSize: this.pageSize(),
  }));

  constructor() {
    // Single source of truth for fetching — any signal change re-fires.
    effect(() => {
      const trigger = this.fetchTrigger();
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.fetch(trigger), 300);
    });

    // Auto-refresh when another tab or another part of the app
    // invalidates the representatives cache.
    onInvalidate(this.cache, 'representatives', () => this.refresh());
  }

  ngOnInit(): void {
    // The effect fires on first render — no explicit kickoff needed.
  }

  // ─────────── data loaders ───────────

  protected fetch(
    trigger: { search: string; pageIndex: number; pageSize: number },
    force = false,
  ): void {
    this.loading.set(true);
    const stream$ = force
      ? this.service.refreshList(trigger)
      : this.service.list(trigger);
    stream$.subscribe({
      next: (res) => {
        this.reps.set(res?.data ?? []);
        this.count.set(res?.count ?? 0);
        this.totalPages.set(res?.totalPages ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.reps.set([]);
        this.count.set(0);
        this.totalPages.set(0);
        this.loading.set(false);
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

  protected onPageChange(page: number): void {
    this.pageIndex.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
  }

  // ─────────── modal handlers ───────────

  protected openCreate(): void {
    this.modalRep.set(null);
    this.modalMode.set('create');
    this.modalOpen.set(true);
  }

  protected openEdit(rep: Representative): void {
    this.modalRep.set(rep);
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  protected openView(rep: Representative): void {
    this.modalRep.set(rep);
    this.modalMode.set('view');
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected onSaved(saved: Representative): void {
    const wasCreate = this.modalMode() === 'create';
    this.modalOpen.set(false);

    if (wasCreate) {
      // Jump to page 1 so the freshly-created rep is visible.
      if (this.pageIndex() !== 1) this.pageIndex.set(1);
      else this.refresh();
      return;
    }

    // Edit: update in-place to avoid a network round-trip when the row
    // is already on this page.
    const onPage = this.reps().some((r) => r.id === saved.id);
    if (onPage) {
      this.reps.update((list) =>
        list.map((r) => (r.id === saved.id ? saved : r)),
      );
    } else {
      this.refresh();
    }
  }

  // ─────────── delete ───────────

  protected async confirmDelete(rep: Representative): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'حذف مندوب',
      message: `هل أنت متأكد من حذف "${rep.fullName}"؟ سيتم أيضًا تعطيل خزينته الفرعية. هذا الإجراء لا يمكن التراجع عنه.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (!ok) return;

    this.deletingId.set(rep.id);
    this.service.delete(rep.id).subscribe({
      next: (res) => {
        this.deletingId.set(null);
        this.toast.success('تم حذف المندوب بنجاح');
        // If we just emptied the page (and it isn't the first), step back.
        if (this.reps().length === 1 && this.pageIndex() > 1) {
          this.pageIndex.update((p) => p - 1);
        } else {
          this.refresh();
        }
      },
      error: (err: ApiError) => {
        this.deletingId.set(null);
        this.toast.error(err.message || 'تعذّر حذف المندوب');
      },
    });
  }

  // ─────────── view helpers ───────────

  protected statusLabel(status: RepresentativeStatus): string {
    return REP_STATUS_LABELS[status] ?? status;
  }

  protected statusBadge(status: RepresentativeStatus): BadgeType {
    return REP_STATUS_BADGE[status] ?? 'info';
  }

  protected permissionLabel(perm: RepresentativePermission): string {
    return REP_PERMISSION_LABELS[perm] ?? perm;
  }

  protected permissionBadge(perm: RepresentativePermission): BadgeType {
    return REP_PERMISSION_BADGE[perm] ?? 'info';
  }

  /** Render 0..5 as ★/☆ glyphs, rounded to the nearest whole. */
  protected stars(rating: number): boolean[] {
    const filled = Math.max(0, Math.min(5, Math.round(rating)));
    return Array.from({ length: 5 }, (_, i) => i < filled);
  }
}
