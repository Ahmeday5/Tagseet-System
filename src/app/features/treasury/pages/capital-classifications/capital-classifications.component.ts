import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../core/constants/permissions.const';
import { ApiError } from '../../../../core/models/api-response.model';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { HttpCacheService } from '../../../../core/services/http-cache.service';
import { onInvalidate } from '../../../../core/utils/auto-refresh.util';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

import { CapitalClassificationsService } from '../../services/capital-classifications.service';
import { CapitalClassification } from '../../models/capital-classification.model';
import { CapitalClassificationFormModalComponent } from '../../components/capital-classification-form-modal/capital-classification-form-modal.component';
import { CapitalClassificationStatementModalComponent } from '../../components/capital-classification-statement-modal/capital-classification-statement-modal.component';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

/** CRUD + company-wide statement for capital classifications (تصنيفات رأس المال). */
@Component({
  selector: 'app-capital-classifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    RouterLink,
    PaginationComponent,
    DateArPipe,
    HasPermissionDirective,
    CapitalClassificationFormModalComponent,
    CapitalClassificationStatementModalComponent,
  ],
  templateUrl: './capital-classifications.component.html',
})
export class CapitalClassificationsComponent {
  private readonly service = inject(CapitalClassificationsService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly cache = inject(HttpCacheService);

  protected readonly PERMS = PERMISSIONS;

  protected readonly rows = signal<CapitalClassification[]>([]);
  protected readonly loading = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly count = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly deletingId = signal<number | null>(null);

  // ── modals ──
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<CapitalClassification | null>(null);
  protected readonly statementOpen = signal(false);
  protected readonly statementTarget = signal<CapitalClassification | null>(null);

  private readonly fetchTrigger = computed(() => ({
    search: this.searchTerm().trim(),
    pageIndex: this.pageIndex(),
    pageSize: this.pageSize(),
  }));

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const trigger = this.fetchTrigger();
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.fetch(trigger, false), SEARCH_DEBOUNCE_MS);
    });

    // Capital movements change `transactionsCount`; classification writes change the list.
    onInvalidate(this.cache, 'capital-classification', () => this.refresh());
    onInvalidate(this.cache, 'shareholder', () => this.refresh());
  }

  protected refresh(): void {
    this.fetch(this.fetchTrigger(), true);
  }

  protected onSearch(value: string): void {
    this.searchTerm.set(value);
    if (this.pageIndex() !== 1) this.pageIndex.set(1);
  }

  protected clearSearch(): void {
    this.onSearch('');
  }

  protected onPageChange(page: number): void {
    this.pageIndex.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    if (this.pageIndex() !== 1) this.pageIndex.set(1);
  }

  // ── form ──

  protected openCreate(): void {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(c: CapitalClassification): void {
    this.editing.set(c);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected onSaved(): void {
    // Cache invalidation in the service triggers the refresh.
    this.formOpen.set(false);
  }

  // ── statement ──

  protected openStatement(c: CapitalClassification): void {
    this.statementTarget.set(c);
    this.statementOpen.set(true);
  }

  protected closeStatement(): void {
    this.statementOpen.set(false);
  }

  // ── delete ──

  protected async confirmDelete(c: CapitalClassification): Promise<void> {
    if (this.deletingId() !== null) return;
    const ok = await this.dialog.confirm({
      title: 'حذف تصنيف',
      message: `هل أنت متأكد من حذف التصنيف "${c.name}"؟`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (!ok) return;

    this.deletingId.set(c.id);
    this.service.delete(c.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toast.success('تم حذف التصنيف بنجاح');
        if (this.rows().length === 1 && this.pageIndex() > 1) {
          this.pageIndex.update((p) => p - 1);
        }
      },
      error: (err: ApiError) => {
        this.deletingId.set(null);
        // 400 when the classification is still used — the API explains why.
        this.toast.error(apiErrorToMessage(err, 'تعذّر حذف التصنيف'));
      },
    });
  }

  private fetch(trigger: ReturnType<typeof this.fetchTrigger>, force: boolean): void {
    this.loading.set(true);
    this.service.list(trigger, force).subscribe({
      next: (page) => {
        this.rows.set(page?.data ?? []);
        this.count.set(page?.count ?? 0);
        this.totalPages.set(page?.totalPages ?? 0);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.rows.set([]);
        this.count.set(0);
        this.totalPages.set(0);
        this.loading.set(false);
        this.toast.error(err?.message || 'تعذّر تحميل تصنيفات رأس المال');
      },
    });
  }
}
