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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import {
  FormMode,
  formModeSubmitLabel,
  formModeTitle,
} from '../../../../shared/models/form-mode.model';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import {
  CreateTreasuryPayload,
  Treasury,
  UpdateTreasuryPayload,
} from '../../models/treasury.model';
import { TreasuryService } from '../../services/treasury.service';
import { TreasuryType } from '../../enums/treasury-type.enum';
import { TREASURY_TYPE_OPTIONS } from '../../constants/treasury-type-labels';

/**
 * Add / edit dialog for a Treasury.
 *
 *   <app-treasury-form-model
 *     [open]="modalOpen()"
 *     [mode]="modalMode()"
 *     [treasury]="modalTreasury()"
 *     (closed)="closeModal()"
 *     (saved)="onSaved($event)" />
 *
 * Notes:
 *   - `initialBalance` is only sent on CREATE — the API doesn't accept it
 *     on PUT (current balance is server-managed).
 *   - The form fully resets every time `open` flips to true, so reopening
 *     the modal in a different mode never shows stale data from the
 *     previous session.
 */
@Component({
  selector: 'app-treasury-form-model',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent],
  templateUrl: './treasury-form-model.component.html',
  styleUrl: './treasury-form-model.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryFormModelComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();
  readonly mode = input.required<FormMode>();
  readonly treasury = input<Treasury | null>(null);

  // ── outputs ──
  readonly closed = output<void>();
  readonly saved = output<Treasury>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TreasuryService);
  private readonly toast = inject(ToastService);

  // ── reactive state (template-bound — must be signals) ──
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  // ── derived ──
  protected readonly isView = computed(() => this.mode() === 'view');
  protected readonly isCreate = computed(() => this.mode() === 'create');
  protected readonly title = computed(() =>
    formModeTitle(this.mode(), 'خزينة'),
  );
  protected readonly submitLabel = computed(() =>
    formModeSubmitLabel(this.mode()),
  );

  protected readonly typeOptions = TREASURY_TYPE_OPTIONS;

  // ── form ──
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    initialBalance: [0, [Validators.required, Validators.min(0)]],
    type: [TreasuryType.Main, [Validators.required]],
    isActive: [true, [Validators.required]],
  });

  constructor() {
    effect(
      () => {
        if (!this.open()) return;

        this.serverError.set(null);
        this.submitting.set(false);
        this.applyModeRules();
        this.resetFormToInputs();
      },
      { allowSignalWrites: true },
    );
  }

  // ─────────────── public template handlers ───────────────

  protected onSubmit(): void {
    if (this.isView() || this.submitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const isCreate = this.isCreate();

    this.serverError.set(null);
    this.submitting.set(true);

    const stream = isCreate
      ? this.service.create(this.toCreatePayload(raw))
      : this.service.update(this.treasury()!.id, this.toUpdatePayload(raw));

    stream.subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.toast.success(
          isCreate ? 'تم إضافة الخزينة بنجاح' : 'تم حفظ التعديلات',
        );
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

  // ─────────────── internals ───────────────

  /** Disable the whole form in view mode; otherwise enable it. */
  private applyModeRules(): void {
    if (this.isView()) {
      this.form.disable({ emitEvent: false });
      return;
    }
    this.form.enable({ emitEvent: false });

    // initialBalance is only meaningful on create.
    const ib = this.form.controls.initialBalance;
    if (this.isCreate()) {
      ib.enable({ emitEvent: false });
    } else {
      ib.disable({ emitEvent: false });
    }
  }

  /**
   * Hydrate the form from the input treasury (edit/view) or reset to
   * sensible defaults (create). Always called after `applyModeRules`
   * so disabled controls stay disabled.
   */
  private resetFormToInputs(): void {
    const t = this.treasury();
    if (t && !this.isCreate()) {
      this.form.reset({
        name: t.name,
        initialBalance: t.currentBalance,
        type: t.type,
        isActive: t.isActive,
      });
      return;
    }

    this.form.reset({
      name: '',
      initialBalance: 0,
      type: TreasuryType.Main,
      isActive: true,
    });
  }

  // ─────────── payload builders ───────────

  private toCreatePayload(raw: {
    name: string;
    initialBalance: number;
    type: TreasuryType;
    isActive: boolean;
  }): CreateTreasuryPayload {
    return {
      name: raw.name.trim(),
      initialBalance: Number(raw.initialBalance) || 0,
      type: raw.type,
      isActive: raw.isActive,
    };
  }

  private toUpdatePayload(raw: {
    name: string;
    type: TreasuryType;
    isActive: boolean;
  }): UpdateTreasuryPayload {
    return {
      name: raw.name.trim(),
      type: raw.type,
      isActive: raw.isActive,
    };
  }
}
