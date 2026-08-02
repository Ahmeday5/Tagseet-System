import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { RepsService } from '../../services/reps.service';
import { CommissionPayoutRow } from '../../models/rep.model';
import { CommonModule } from '@angular/common';
import { PrintService } from '../../../../core/services/print.service';
import { fetchAllPages } from '../../../../core/utils/api-list.util';
import { ToastService } from '../../../../core/services/toast.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { CommissionPayoutEditModalComponent } from '../commission-payout-edit-modal/commission-payout-edit-modal.component';

/**
 * Admin: paginated, name-searchable history of commission payouts
 * (`representatives/commission-payouts`).
 */
@Component({
  selector: 'app-commission-payouts-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ModalComponent,
    PaginationComponent,
    CurrencyArPipe,
    DateArPipe,
    CommonModule,
    CommissionPayoutEditModalComponent,
  ],
  templateUrl: './commission-payouts-modal.component.html',
})
export class CommissionPayoutsModalComponent {
  private readonly service = inject(RepsService);
  private readonly printer = inject(PrintService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);

  readonly open = input.required<boolean>();
  readonly closed = output<void>();

  protected readonly rows = signal<CommissionPayoutRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly count = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly isPrinting = signal(false);
  protected readonly deletingId = signal<number | null>(null);

  protected readonly editOpen = signal(false);
  protected readonly editingPayout = signal<CommissionPayoutRow | null>(null);

  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const search = this.search().trim();
      const pageIndex = this.pageIndex();
      const pageSize = this.pageSize();
      if (!this.open()) return;

      if (this.debounce) clearTimeout(this.debounce);
      this.debounce = setTimeout(
        () => this.fetch({ search, pageIndex, pageSize }),
        300,
      );
    });
  }

  private fetch(q: {
    search: string;
    pageIndex: number;
    pageSize: number;
  }): void {
    this.loading.set(true);
    this.service.commissionPayouts(q).subscribe({
      next: (res) => {
        this.rows.set(res.data ?? []);
        this.count.set(res.count ?? 0);
        this.totalPages.set(res.totalPages ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.count.set(0);
        this.totalPages.set(0);
        this.loading.set(false);
      },
    });
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    if (this.pageIndex() !== 1) this.pageIndex.set(1);
  }

  /** Sequential display number (1, 2, 3…) — independent of the row's real id. */
  protected rowNumber(index: number): number {
    return (this.pageIndex() - 1) * this.pageSize() + index + 1;
  }

  protected onPageChange(page: number): void {
    this.pageIndex.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
  }

  private refresh(): void {
    this.fetch({
      search: this.search().trim(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    });
  }

  // ─────────── edit ───────────

  protected openEdit(row: CommissionPayoutRow): void {
    this.editingPayout.set(row);
    this.editOpen.set(true);
  }

  protected onEditClosed(): void {
    this.editOpen.set(false);
    this.editingPayout.set(null);
  }

  protected onEditSaved(): void {
    this.editOpen.set(false);
    this.editingPayout.set(null);
    this.refresh();
  }

  // ─────────── delete ───────────

  protected async confirmDelete(row: CommissionPayoutRow): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'حذف سند صرف عمولة',
      message: `هل أنت متأكد من حذف سند صرف العمولة الخاص بـ "${row.representativeName}" بمبلغ ${row.amount}؟ هذا الإجراء لا يمكن التراجع عنه.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (!ok) return;

    this.deletingId.set(row.id);
    this.service.deleteCommissionPayout(row.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toast.success('تم حذف سند صرف العمولة بنجاح');
        if (this.rows().length === 1 && this.pageIndex() > 1) {
          this.pageIndex.update((p) => p - 1);
        } else {
          this.refresh();
        }
      },
      error: (err: ApiError) => {
        this.deletingId.set(null);
        this.toast.error(apiErrorToMessage(err, 'تعذّر حذف سند صرف العمولة'));
      },
    });
  }

  protected printPayouts(): void {
    if (this.isPrinting()) return;
    this.isPrinting.set(true);
    const search = this.search().trim();

    fetchAllPages<CommissionPayoutRow>((pageIndex, pageSize) =>
      this.service.commissionPayouts({ search, pageIndex, pageSize }),
    ).subscribe({
      next: (rows) => {
        this.isPrinting.set(false);
        const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
        const numbered = rows.map((r, i) => ({ ...r, seq: i + 1 }));
        this.printer.print<CommissionPayoutRow & { seq: number }>({
          title: 'سجل دفعات العمولات',
          subtitle: 'كل دفعات العمولات المسددة للمندوبين',
          meta: search ? [{ label: 'بحث', value: search }] : undefined,
          orientation: 'landscape',
          columns: [
            { key: 'seq',                header: 'رقم السند',  align: 'center', bold: true },
            { key: 'representativeName', header: 'المندوب',     align: 'start',  bold: true },
            { key: 'treasuryName',       header: 'الخزينة',     align: 'start' },
            { key: 'amount',             header: 'المبلغ',      align: 'end',    format: 'currency', bold: true },
            { key: 'date',               header: 'التاريخ',     align: 'center', format: 'shortDate' },
            { key: 'notes',              header: 'ملاحظات',    align: 'start' },
          ],
          totals: {
            label: 'إجمالي المسدد',
            labelColSpan: 3,
            cells: [
              `${Math.round(total).toLocaleString('ar-EG')} ج.م`,
              '',
              '',
            ],
          },
          rows: numbered,
        });
      },
      error: () => this.isPrinting.set(false),
    });
  }
}
