import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Treasury } from '../../models/treasury.model';
import { TreasuryService } from '../../services/treasury.service';
import { TreasuryFormModelComponent } from '../../components/treasury-form-model/treasury-form-model.component';
import { BadgeComponent, BadgeType } from '../../../../shared/components/badge/badge.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { FormMode } from '../../../../shared/models/form-mode.model';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { TreasuryType } from '../../enums/treasury-type.enum';
import {
  TREASURY_TYPE_BADGE,
  TREASURY_TYPE_LABELS,
} from '../../constants/treasury-type-labels';

/**
 * Treasury home page.
 *
 * Owns three independent concerns:
 *
 *   1. Treasuries list (LIVE — fed from `/dashboard/treasuries`).
 *      Drives the hero summary, the breakdown chips and the manage card.
 *
 *   2. CRUD modal (create / edit) — local UI state only.
 *
 *   3. Static analytics tables (last operations, monthly P&L, sub-accounts,
 *      representatives) — kept untouched until their own endpoints land.
 */
@Component({
  selector: 'app-treasury-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TreasuryFormModelComponent,
    BadgeComponent,
    CurrencyArPipe,
  ],
  templateUrl: './treasury-home.component.html',
  styleUrl: './treasury-home.component.scss',
})
export class TreasuryHomeComponent implements OnInit {
  private readonly treasuryService = inject(TreasuryService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  // ── data ──
  protected readonly treasuries = signal<Treasury[]>([]);
  protected readonly loading = signal(false);

  // ── modal state ──
  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<FormMode>('create');
  protected readonly modalTreasury = signal<Treasury | null>(null);

  /** Tracks which row is currently being deleted, for inline button state. */
  protected readonly deletingId = signal<number | null>(null);

  // ── derived ──
  protected readonly hasTreasuries = computed(() => this.treasuries().length > 0);

  /** Sum of `currentBalance` across every treasury — drives the hero number. */
  protected readonly totalBalance = computed(() =>
    this.treasuries().reduce((sum, t) => sum + (t.currentBalance ?? 0), 0),
  );

  /** Combined balance of all treasuries flagged as `Main`. */
  protected readonly mainBalance = computed(() =>
    this.treasuries()
      .filter((t) => t.type === TreasuryType.Main)
      .reduce((sum, t) => sum + (t.currentBalance ?? 0), 0),
  );

  ngOnInit(): void {
    this.loadTreasuries();
  }

  // ─────────────── data loading ───────────────

  protected loadTreasuries(): void {
    this.loading.set(true);
    this.treasuryService.list().subscribe({
      next: (list) => {
        this.treasuries.set(list ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ─────────────── modal handlers ───────────────

  protected openCreate(): void {
    this.modalTreasury.set(null);
    this.modalMode.set('create');
    this.modalOpen.set(true);
  }

  protected openEdit(treasury: Treasury): void {
    this.modalTreasury.set(treasury);
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected onSaved(saved: Treasury): void {
    const wasCreate = this.modalMode() === 'create';
    this.treasuries.update((list) =>
      wasCreate
        ? [saved, ...list]
        : list.map((t) => (t.id === saved.id ? saved : t)),
    );
    this.modalOpen.set(false);
  }

  // ─────────────── delete ───────────────

  protected async confirmDelete(treasury: Treasury): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'حذف خزينة',
      message: `هل أنت متأكد من حذف "${treasury.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (!ok) return;

    this.deletingId.set(treasury.id);
    this.treasuryService.delete(treasury.id).subscribe({
      next: (res) => {
        this.treasuries.update((list) => list.filter((t) => t.id !== treasury.id));
        this.deletingId.set(null);
        this.toast.success('تم حذف الخزينة بنجاح');
      },
      error: (_err: ApiError) => this.deletingId.set(null),
    });
  }

  // ─────────────── view helpers ───────────────

  protected typeLabel(type: TreasuryType): string {
    return TREASURY_TYPE_LABELS[type] ?? type;
  }

  protected typeBadge(type: TreasuryType): BadgeType {
    return TREASURY_TYPE_BADGE[type] ?? 'info';
  }
}
