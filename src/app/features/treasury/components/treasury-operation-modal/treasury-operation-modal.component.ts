import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { resolveApiMessage } from '../../../../core/constants/api-messages.const';

import { TreasuryOperation } from '../../models/treasury.model';
import { TreasuryService } from '../../services/treasury.service';
import { operationMutationError } from '../../constants/operation-party-labels';

/**
 * Edits a manual treasury operation's amount, date and notes. Treasury and
 * party are fixed — they change only from the operation's source screen.
 *
 *   <app-treasury-operation-modal
 *     [operation]="editingOperation()"
 *     (closed)="closeEditOperation()"
 *     (saved)="onOperationSaved()"
 *     (gone)="onOperationGone()" />
 *
 * `gone` fires on 404 so the host can refetch a stale list.
 */
@Component({
  selector: 'app-treasury-operation-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent],
  templateUrl: './treasury-operation-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryOperationModalComponent {
  /** Operation being edited; `null` keeps the modal closed. */
  readonly operation = input<TreasuryOperation | null>(null);

  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly gone = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TreasuryService);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [''],
    notes: [''],
  });

  constructor() {
    effect(
      () => {
        const op = this.operation();
        if (!op) return;
        untracked(() => {
          this.serverError.set(null);
          this.submitting.set(false);
          this.form.reset({
            amount: op.amount,
            date: (op.date ?? '').slice(0, 10),
            notes: op.description ?? '',
          });
        });
      },
      { allowSignalWrites: true },
    );
  }

  protected onSubmit(): void {
    const op = this.operation();
    if (!op || this.submitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const notes = raw.notes.trim();

    this.serverError.set(null);
    this.submitting.set(true);

    this.service
      .updateOperation(op.id, {
        amount: Number(raw.amount),
        ...(raw.date ? { date: raw.date } : {}),
        notes: notes || null,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.toast.success(resolveApiMessage(res.message, 'تم تعديل العملية بنجاح'));
          this.saved.emit();
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          const message = operationMutationError(err);
          if (err.status === 404) {
            this.toast.error(message);
            this.gone.emit();
            return;
          }
          this.serverError.set(message);
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
}
