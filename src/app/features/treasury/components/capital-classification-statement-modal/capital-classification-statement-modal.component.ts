import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';

import { CapitalClassificationsService } from '../../services/capital-classifications.service';
import {
  CapitalClassification,
  CapitalClassificationStatement,
  CapitalClassificationStatementEntry,
} from '../../models/capital-classification.model';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Company-wide ledger for one capital classification: every tagged deposit
 * (+) / withdrawal (−) across all shareholders, with a running balance.
 */
@Component({
  selector: 'app-capital-classification-statement-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, PaginationComponent, BadgeComponent, CurrencyArPipe, DateArPipe],
  templateUrl: './capital-classification-statement-modal.component.html',
})
export class CapitalClassificationStatementModalComponent {
  readonly open = input.required<boolean>();
  readonly classification = input<CapitalClassification | null>(null);
  readonly closed = output<void>();

  private readonly service = inject(CapitalClassificationsService);

  protected readonly statement = signal<CapitalClassificationStatement | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  protected readonly title = computed(
    () => `كشف حساب تصنيف — ${this.classification()?.name ?? ''}`,
  );
  protected readonly entries = computed(() => this.statement()?.entries?.data ?? []);
  protected readonly count = computed(() => this.statement()?.entries?.count ?? 0);
  protected readonly totalPages = computed(() => this.statement()?.entries?.totalPages ?? 0);
  protected readonly hasDates = computed(() => !!this.fromDate() || !!this.toDate());

  constructor() {
    effect(
      () => {
        const c = this.classification();
        if (!this.open() || !c) return;
        untracked(() => {
          this.statement.set(null);
          this.fromDate.set('');
          this.toDate.set('');
          this.pageIndex.set(1);
          this.fetch(false);
        });
      },
      { allowSignalWrites: true },
    );
  }

  protected isDeposit(e: CapitalClassificationStatementEntry): boolean {
    return (e.signedAmount ?? 0) >= 0;
  }

  protected apply(): void {
    this.pageIndex.set(1);
    this.fetch(true);
  }

  protected clearDates(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.apply();
  }

  protected onPageChange(page: number): void {
    this.pageIndex.set(page);
    this.fetch(false);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
    this.fetch(false);
  }

  protected refresh(): void {
    this.fetch(true);
  }

  protected close(): void {
    this.closed.emit();
  }

  private fetch(force: boolean): void {
    const c = this.classification();
    if (!c) return;
    this.loading.set(true);
    this.error.set(null);
    this.service
      .statement(
        c.id,
        {
          pageIndex: this.pageIndex(),
          pageSize: this.pageSize(),
          fromDate: this.fromDate() || undefined,
          toDate: this.toDate() || undefined,
        },
        force,
      )
      .subscribe({
        next: (res) => {
          this.statement.set(res);
          this.loading.set(false);
        },
        error: (err: ApiError) => {
          this.statement.set(null);
          this.loading.set(false);
          this.error.set(err?.message || 'تعذّر تحميل كشف حساب التصنيف');
        },
      });
  }
}
