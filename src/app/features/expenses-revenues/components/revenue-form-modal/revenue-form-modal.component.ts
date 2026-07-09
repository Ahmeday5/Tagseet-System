import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';

import { RevenuesService } from '../../services/revenues.service';
import { RevenueDto } from '../../models/revenue.model';

/**
 * Create-revenue dialog.
 *
 *   <app-revenue-form-modal
 *     [open]="revenueFormOpen()"
 *     [treasuries]="treasuryOptions()"
 *     (closed)="closeRevenueForm()"
 *     (saved)="onRevenueSaved($event)" />
 *
 * The form resets every time `open` flips to true so reopening never shows
 * stale state from the previous attempt.
 */
@Component({
  selector: 'app-revenue-form-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './revenue-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevenueFormModalComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();
  readonly treasuries = input.required<
    { value: number | string; label: string }[]
  >();

  // ── outputs ──
  readonly closed = output<void>();
  readonly saved = output<RevenueDto>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RevenuesService);
  private readonly toast = inject(ToastService);

  // ── reactive state ──
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  // ── form ──
  protected readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    treasuryId: this.fb.control<number | null>(null, [Validators.required]),
    date: [todayIso(), [Validators.required]],
    notes: [''],
  });

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        this.serverError.set(null);
        this.submitting.set(false);
        this.resetForm();
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
    this.serverError.set(null);
    this.submitting.set(true);

    this.service
      .create({
        amount: Number(raw.amount) || 0,
        date: raw.date,
        treasuryId: Number(raw.treasuryId),
        notes: (raw.notes ?? '').trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.toast.success(`تم تسجيل ${res.revenueNumber} بنجاح`);
          this.saved.emit(res);
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

  private resetForm(): void {
    this.form.reset({
      amount: 0,
      treasuryId: null,
      date: todayIso(),
      notes: '',
    });
  }
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
