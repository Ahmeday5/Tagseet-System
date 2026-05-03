import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { WarehouseService } from '../../services/warehouse.service';
import {
  StockAlertLevel,
  Warehouse,
  WarehouseDetailItem,
  WarehouseItem,
  WarehouseLocation,
} from '../../models/warehouse.model';
import { WarehouseFormModalComponent } from '../../components/warehouse-form-modal/warehouse-form-modal.component';
import { FormMode } from '../../../../shared/models/form-mode.model';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';

/**
 * Per-card cycling palette. The API doesn't expose a "color" yet, so we
 * rotate through these three tones to match the prototype's visual rhythm
 * (teal / purple / amber). Picked deterministically by card index so the
 * same warehouse always gets the same color across renders.
 */
const CARD_PALETTE = ['te', 'pu', 'am'] as const;
const BADGE_PALETTE = ['bte', 'bpu', 'bwarn'] as const;

/**
 * Mock per-warehouse stats. The backend will expose these later — until
 * then we cycle through three placeholder sets so the cards look
 * varied like in the design.
 */
interface WarehouseStats {
  purchased: number;
  sold: number;
  available: number;
  buyValue: number;
  profit: number;
  pct: number;
  /** Highlighted hint shown under the progress bar when set. */
  warning?: string;
}

const MOCK_STATS: ReadonlyArray<WarehouseStats> = [
  { purchased: 85, sold: 62, available: 23, buyValue: 68000, profit: 27800, pct: 73 },
  { purchased: 40, sold: 28, available: 12, buyValue: 48000, profit: 19200, pct: 70 },
  { purchased: 20, sold: 18, available: 2,  buyValue: 16000, profit: 6400,  pct: 90, warning: '90% مباع — يحتاج تجديد' },
];

/**
 * Warehouse home page.
 *
 * Owns three concerns:
 *
 *   1. Live warehouses list (`/dashboard/warehouses`) — drives the
 *      card grid. One card per warehouse, dynamically rendered.
 *
 *   2. CRUD modal (create / edit / delete) — local UI state only.
 *      Triggered from the page-header button and per-card actions.
 *
 *   3. Static analytics (per-card stats, detail items table with
 *      serial numbers) — kept until their dedicated endpoints land.
 */
@Component({
  selector: 'app-warehouse-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CurrencyArPipe,
    WarehouseFormModalComponent,
  ],
  templateUrl: './warehouse-home.component.html',
  styleUrl: './warehouse-home.component.scss',
})
export class WarehouseHomeComponent implements OnInit {
  private readonly svc = inject(WarehouseService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  // ── live API data ──
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly loading = signal(false);

  // ── modal state ──
  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<FormMode>('create');
  protected readonly modalWarehouse = signal<Warehouse | null>(null);
  /** Tracks which row is currently being deleted, for inline button state. */
  protected readonly deletingId = signal<number | null>(null);

  // ── kept for inv-alerts badge count + dropdowns elsewhere ──
  protected readonly items = signal<WarehouseItem[]>([]);
  protected readonly locations = signal<WarehouseLocation[]>([]);
  protected readonly detailItems = signal<WarehouseDetailItem[]>([]);

  // ── derived ──
  protected readonly hasWarehouses = computed(
    () => this.warehouses().length > 0,
  );

  protected readonly criticalCount = computed(
    () => this.items().filter((i) => i.alertLevel !== 'ok').length,
  );

  ngOnInit(): void {
    this.loadWarehouses();
    // Mock data still feeds the alerts badge — kept until endpoints land.
    this.svc.getAll().subscribe((items) => this.items.set(items));
  }

  // ─────────────── live: data loading ───────────────

  protected loadWarehouses(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (list) => {
        this.warehouses.set(list ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ─────────────── live: modal handlers ───────────────

  protected openCreate(): void {
    this.modalWarehouse.set(null);
    this.modalMode.set('create');
    this.modalOpen.set(true);
  }

  protected openEdit(warehouse: Warehouse): void {
    this.modalWarehouse.set(warehouse);
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected onSaved(saved: Warehouse): void {
    const wasCreate = this.modalMode() === 'create';
    this.warehouses.update((list) =>
      wasCreate
        ? [saved, ...list]
        : list.map((w) => (w.id === saved.id ? saved : w)),
    );
    this.modalOpen.set(false);
  }

  // ─────────────── live: delete ───────────────

  protected async confirmDelete(warehouse: Warehouse): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'حذف مخزن',
      message: `هل أنت متأكد من حذف "${warehouse.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (!ok) return;

    this.deletingId.set(warehouse.id);
    this.svc.delete(warehouse.id).subscribe({
      next: (res) => {
        this.warehouses.update((list) =>
          list.filter((w) => w.id !== warehouse.id),
        );
        this.deletingId.set(null);
        this.toast.success(res?.message || 'تم حذف المخزن');
      },
      error: (_err: ApiError) => this.deletingId.set(null),
    });
  }

  // ─────────────── per-card view helpers ───────────────

  /** Cycles `te / pu / am` based on card index. */
  protected colorVar(index: number): string {
    return `var(--${CARD_PALETTE[index % CARD_PALETTE.length]})`;
  }

  /** Cycles `bte / bpu / bwarn` to match the card color. */
  protected badgeClass(index: number): string {
    return BADGE_PALETTE[index % BADGE_PALETTE.length];
  }

  /** Mock stats for the card at this index — cycles through 3 placeholder sets. */
  protected stats(index: number): WarehouseStats {
    return MOCK_STATS[index % MOCK_STATS.length];
  }

  // ─────────────── existing alert helpers (kept untouched) ───────────────

  protected getAlertLabel(level: StockAlertLevel): string {
    const labels: Record<StockAlertLevel, string> = {
      ok: 'كافٍ',
      low: 'منخفض',
      critical: 'حرج',
    };
    return labels[level];
  }

  protected getAlertBadge(level: StockAlertLevel): 'ok' | 'warn' | 'bad' {
    const map: Record<StockAlertLevel, 'ok' | 'warn' | 'bad'> = {
      ok: 'ok',
      low: 'warn',
      critical: 'bad',
    };
    return map[level];
  }
}
