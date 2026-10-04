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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Observable, map } from 'rxjs';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { resolveApiMessage } from '../../../../core/constants/api-messages.const';

import { Treasury, TreasuryTransfer } from '../../models/treasury.model';
import { TreasuryService } from '../../services/treasury.service';
import { TreasuryType } from '../../enums/treasury-type.enum';

/** Profit treasuries are settlement-only — the backend rejects transfers into/out of them. */
const PROFIT_TREASURY_TYPES: ReadonlySet<TreasuryType> = new Set([
  TreasuryType.Profits,
  TreasuryType.SubRepresentativeProfits,
  TreasuryType.CompanyProfits,
]);

/**
 * Inter-treasury transfer dialog — create, or edit when `[transfer]` is set.
 *
 *   <app-treasury-transfer-modal
 *     [open]="transferOpen()"
 *     [treasuries]="treasuries()"
 *     [transfer]="editingTransfer()"
 *     (closed)="closeTransfer()"
 *     (saved)="onTransferSaved($event)" />
 *
 * The form resets (or re-seeds from `transfer`) every time `open` flips to
 * true so reopening never shows stale state from the previous attempt.
 * `fromTreasuryId` and `toTreasuryId` must differ — enforced via a form-level
 * validator.
 */
@Component({
  selector: 'app-treasury-transfer-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent],
  templateUrl: './treasury-transfer-modal.component.html',
  styleUrl: './treasury-transfer-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryTransferModalComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();
  readonly treasuries = input.required<Treasury[]>();
  /** Transfer being edited; `null` means create. */
  readonly transfer = input<TreasuryTransfer | null>(null);

  // ── outputs ──
  readonly closed = output<void>();
  readonly saved = output<TreasuryTransfer>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TreasuryService);
  private readonly toast = inject(ToastService);

  // ── reactive state ──
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  // ── derived ──
  protected readonly isEdit = computed(() => this.transfer() !== null);

  /**
   * Active, non-profit treasuries. When editing, the transfer's own legs stay
   * selectable even if since deactivated, so the form doesn't open invalid.
   */
  protected readonly selectableTreasuries = computed(() => {
    const t = this.transfer();
    const keep = new Set(t ? [t.fromTreasuryId, t.toTreasuryId] : []);
    return this.treasuries().filter(
      (x) =>
        !PROFIT_TREASURY_TYPES.has(x.type) && (x.isActive || keep.has(x.id)),
    );
  });

  // ── form ──
  protected readonly form = this.fb.nonNullable.group(
    {
      fromTreasuryId: [null as number | null, [Validators.required]],
      toTreasuryId: [null as number | null, [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      transferDate: [todayIso(), [Validators.required]],
      notes: [''],
    },
    { validators: [distinctTreasuriesValidator()] },
  );

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        const transfer = untracked(this.transfer);
        this.serverError.set(null);
        this.submitting.set(false);
        this.resetForm(transfer);
      },
      { allowSignalWrites: true },
    );
  }

  protected onSubmit(): void {
    if (this.submitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const base = {
      fromTreasuryId: Number(raw.fromTreasuryId),
      toTreasuryId: Number(raw.toTreasuryId),
      amount: Number(raw.amount) || 0,
      transferDate: raw.transferDate,
    };
    const notes = (raw.notes ?? '').trim();
    const editing = this.transfer();

    const request$: Observable<{ data: TreasuryTransfer; message: string }> =
      editing
        ? this.service
            .updateTransfer(editing.id, { ...base, notes: notes || null })
            .pipe(
              map((res) => ({
                data: res.data,
                message: resolveApiMessage(res.message, 'تم تعديل التحويل بنجاح'),
              })),
            )
        : this.service
            .createTransfer({ ...base, notes })
            .pipe(map((data) => ({ data, message: 'تم تنفيذ التحويل بنجاح' })));

    this.serverError.set(null);
    this.submitting.set(true);

    request$.subscribe({
      next: ({ data, message }) => {
        this.submitting.set(false);
        this.toast.success(message);
        this.saved.emit(data);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.message);
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

  /** Form-level error shown under the "to" select when both are equal. */
  protected showSameTreasuryError(): boolean {
    const err = this.form.errors?.['sameTreasury'];
    if (!err) return false;
    return this.form.controls.toTreasuryId.touched;
  }

  // ── internals ──

  private resetForm(transfer: TreasuryTransfer | null): void {
    this.form.reset(
      transfer
        ? {
            fromTreasuryId: transfer.fromTreasuryId,
            toTreasuryId: transfer.toTreasuryId,
            amount: transfer.amount,
            transferDate: (transfer.transferDate ?? '').slice(0, 10) || todayIso(),
            notes: transfer.notes ?? '',
          }
        : {
            fromTreasuryId: null,
            toTreasuryId: null,
            amount: 0,
            transferDate: todayIso(),
            notes: '',
          },
    );
  }
}

/** Cross-field validator: `fromTreasuryId` must differ from `toTreasuryId`. */
function distinctTreasuriesValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const from = group.get('fromTreasuryId')?.value;
    const to = group.get('toTreasuryId')?.value;
    if (from == null || to == null) return null;
    return Number(from) === Number(to) ? { sameTreasury: true } : null;
  };
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
