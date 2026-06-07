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
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';

import { ShareholdersService } from '../../services/shareholders.service';
import { ProfitSettlementPreview } from '../../models/profit-settlement.model';

/**
 * Capitalize-all-profits dialog.
 *
 *   <app-capitalize-all-profits-modal
 *     [open]="capitalizeAllOpen()"
 *     (closed)="closeCapitalizeAll()"
 *     (capitalized)="onCapitalizedAll()" />
 *
 * On open it fetches the live preview to determine the profits treasury and
 * each shareholder's AccruedProfit. The user only picks a date and an optional
 * note — amounts are fully server-managed.
 */
@Component({
  selector: 'app-capitalize-all-profits-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    CurrencyArPipe,
  ],
  templateUrl: './capitalize-all-profits-modal.component.html',
  styleUrl: './capitalize-all-profits-modal.component.scss',
})
export class CapitalizeAllProfitsModalComponent {
  readonly open = input.required<boolean>();

  readonly closed = output<void>();
  readonly capitalized = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ShareholdersService);
  private readonly toast = inject(ToastService);

  protected readonly preview = signal<ProfitSettlementPreview | null>(null);
  protected readonly loadingPreview = signal(false);
  protected readonly previewError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly lines = computed(() =>
    (this.preview()?.lines ?? []).filter((l) => l.amount > 0),
  );
  protected readonly totalAmount = computed(
    () => this.preview()?.totalAmount ?? 0,
  );
  protected readonly canCapitalize = computed(
    () => this.totalAmount() > 0 && this.lines().length > 0,
  );

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

  protected onSubmit(): void {
    if (this.submitting() || !this.canCapitalize()) return;
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
      .capitalizeAllProfits({
        profitsTreasuryId: treasuryId,
        date: raw.date,
        notes: (raw.notes ?? '').trim(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success('تم ترحيل أرباح جميع المساهمين إلى رأس المال بنجاح');
          this.capitalized.emit();
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.serverError.set(err.message || 'تعذّر ترحيل الأرباح');
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
        this.previewError.set(err.message || 'تعذّر تحميل بيانات الأرباح');
      },
    });
  }

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
