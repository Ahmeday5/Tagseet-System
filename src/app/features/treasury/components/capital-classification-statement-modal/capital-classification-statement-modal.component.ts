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
import { map } from 'rxjs';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { fetchAllPages } from '../../../../core/utils/api-list.util';
import { reserveWhatsappShare } from '../../../../shared/utils/whatsapp-share.util';

import { CapitalClassificationsService } from '../../services/capital-classifications.service';
import {
  CapitalClassification,
  CapitalClassificationStatement,
  CapitalClassificationStatementEntry,
} from '../../models/capital-classification.model';
import { periodTitle } from '../../constants/period-title.util';
import {
  buildClassificationWhatsappMessage,
  classificationEntryTypeLabel,
} from '../../constants/classification-whatsapp.util';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Company-wide ledger for one capital classification: every tagged deposit
 * (+) / withdrawal (−) across all shareholders, with a running balance.
 */
@Component({
  selector: 'app-capital-classification-statement-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ModalComponent,
    PaginationComponent,
    BadgeComponent,
    CurrencyArPipe,
    DateArPipe,
  ],
  templateUrl: './capital-classification-statement-modal.component.html',
  styles: [
    `.btn-wa {
      border-color: #25d366;
      color: #128c7e;
    }
    .btn-wa:hover:not(:disabled) {
      background: #25d366;
      color: #fff;
    }`,
  ],
})
export class CapitalClassificationStatementModalComponent {
  readonly open = input.required<boolean>();
  readonly classification = input<CapitalClassification | null>(null);
  readonly closed = output<void>();

  private readonly service = inject(CapitalClassificationsService);
  private readonly toast = inject(ToastService);

  protected readonly statement = signal<CapitalClassificationStatement | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  /** The dates the currently-shown totals cover (applied, not draft). */
  protected readonly appliedFrom = signal('');
  protected readonly appliedTo = signal('');
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  /** Fetching every page for the WhatsApp message. */
  protected readonly sharing = signal(false);

  protected readonly title = computed(
    () => `كشف حساب تصنيف — ${this.classification()?.name ?? ''}`,
  );
  protected readonly entries = computed(() => this.statement()?.entries?.data ?? []);
  protected readonly count = computed(() => this.statement()?.entries?.count ?? 0);
  protected readonly totalPages = computed(() => this.statement()?.entries?.totalPages ?? 0);
  protected readonly hasDates = computed(() => !!this.fromDate() || !!this.toDate());

  /**
   * Serial of the first row on the shown page — rows are numbered 1, 2, 3…
   * in statement order across pages (taken from the loaded page, so numbers
   * stay right while the next page is still loading).
   */
  protected readonly rowOffset = computed(() => {
    const page = this.statement()?.entries;
    return Math.max(0, ((page?.pageIndex ?? 1) - 1) * (page?.pageSize ?? this.pageSize()));
  });

  protected readonly typeLabel = classificationEntryTypeLabel;

  /** Net-balance card title — reflects the period the totals actually cover. */
  protected readonly netBalanceTitle = computed(() =>
    periodTitle('صافي الرصيد', this.appliedFrom(), this.appliedTo()),
  );

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

  /**
   * Shares the full statement on WhatsApp — every movement of the applied
   * period (all pages), numbered like the table, plus the totals.
   */
  protected shareOnWhatsApp(): void {
    const st = this.statement();
    const c = this.classification();
    if (!st || !c || this.sharing()) return;

    // Reserved inside the click so the popup isn't blocked after the fetch.
    const share = reserveWhatsappShare();
    const from = this.appliedFrom();
    const to = this.appliedTo();
    this.sharing.set(true);

    fetchAllPages<CapitalClassificationStatementEntry>((pageIndex, pageSize) =>
      this.service
        .statement(
          c.id,
          { pageIndex, pageSize, fromDate: from || undefined, toDate: to || undefined },
          true,
        )
        .pipe(map((res) => res.entries)),
    ).subscribe({
      next: (entries) => {
        this.sharing.set(false);
        share.send(
          buildClassificationWhatsappMessage(c.name, st, entries, this.periodLine(from, to)),
        );
      },
      error: (err: ApiError) => {
        this.sharing.set(false);
        share.cancel();
        this.toast.error(apiErrorToMessage(err, 'تعذّر تجهيز كشف الحساب للمشاركة'));
      },
    });
  }

  private periodLine(from: string, to: string): string {
    if (from && to) return `الفترة: من ${from} إلى ${to}`;
    if (from) return `الفترة: من ${from}`;
    if (to) return `الفترة: حتى ${to}`;
    return 'الفترة: كل الحركات';
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
          this.appliedFrom.set(this.fromDate() || '');
          this.appliedTo.set(this.toDate() || '');
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
