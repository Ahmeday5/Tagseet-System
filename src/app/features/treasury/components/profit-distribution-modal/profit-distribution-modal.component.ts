import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';

import { ShareholdersService } from '../../services/shareholders.service';
import {
  ProfitSettlement,
  ProfitSettlementPreview,
} from '../../models/profit-settlement.model';

/**
 * Profit-distribution dialog.
 *
 *   <app-profit-distribution-modal
 *     [open]="distributeOpen()"
 *     (closed)="closeDistribute()"
 *     (settled)="onSettled($event)" />
 *
 * On open it fetches a live preview (the profits treasury + each shareholder's
 * proportional slice). The treasury and amounts are server-computed and shown
 * read-only — the user only confirms the date and an optional note. Confirm is
 * disabled when there are no profits to distribute.
 */
@Component({
  selector: 'app-profit-distribution-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    ModalComponent,
    FormErrorComponent,
    CurrencyArPipe,
  ],
  templateUrl: './profit-distribution-modal.component.html',
  styleUrl: './profit-distribution-modal.component.scss',
})
export class ProfitDistributionModalComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();

  // ── outputs ──
  readonly closed = output<void>();
  readonly settled = output<ProfitSettlement>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ShareholdersService);
  private readonly toast = inject(ToastService);

  // ── state ──
  protected readonly preview = signal<ProfitSettlementPreview | null>(null);
  protected readonly loadingPreview = signal(false);
  protected readonly previewError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  // ── derived ──
  protected readonly lines = computed(() => this.preview()?.lines ?? []);
  protected readonly totalAmount = computed(
    () => this.preview()?.totalAmount ?? 0,
  );
  /** Only allow a distribution when there's a positive balance to split. */
  protected readonly canDistribute = computed(
    () => this.totalAmount() > 0 && this.lines().length > 0,
  );

  // ── form ──
  protected readonly form = this.fb.nonNullable.group({
    date: [this.todayISO(), [Validators.required]],
    notes: [''],
  });

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        this.serverError.set(null);
        this.submitting.set(false);
        this.form.reset({ date: this.todayISO(), notes: '' });
        this.loadPreview();
      },
      { allowSignalWrites: true },
    );
  }

  // ─────────── template handlers ───────────

  protected onSubmit(): void {
    if (this.submitting() || !this.canDistribute()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const treasuryId = this.preview()?.profitsTreasuryId;
    if (!treasuryId) return;

    const raw = this.form.getRawValue();
    this.serverError.set(null);
    this.submitting.set(true);

    this.service
      .settleProfits({
        treasuryId,
        date: raw.date,
        notes: (raw.notes ?? '').trim(),
      })
      .subscribe({
        next: (settlement) => {
          this.submitting.set(false);
          this.toast.success('تم توزيع الأرباح بنجاح');
          this.settled.emit(settlement);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.serverError.set(err.message || 'تعذّر توزيع الأرباح');
        },
      });
  }

  protected close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  protected isInvalid(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  // ─────────── internals ───────────

  private loadPreview(): void {
    this.preview.set(null);
    this.previewError.set(null);
    this.loadingPreview.set(true);
    this.service.previewSettlement().subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.loadingPreview.set(false);
      },
      error: (err: ApiError) => {
        this.loadingPreview.set(false);
        this.previewError.set(err.message || 'تعذّر تحميل بيانات التوزيع');
      },
    });
  }

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
