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
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';

import { CapitalClassificationsService } from '../../services/capital-classifications.service';
import { CapitalClassification } from '../../models/capital-classification.model';

/** Create (when `classification` is null) / edit a capital classification. */
@Component({
  selector: 'app-capital-classification-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="isEdit() ? 'تعديل تصنيف رأس مال' : 'تصنيف رأس مال جديد'"
      size="md"
      [closeOnBackdrop]="!submitting()"
      [closeOnEsc]="!submitting()"
      (closed)="close()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate autocomplete="off">
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label">اسم التصنيف <span class="text-danger">*</span></label>
            <input
              type="text"
              class="form-control"
              formControlName="name"
              placeholder="مثال: مساهمة تأسيسية"
              [class.is-invalid]="form.controls.name.invalid && form.controls.name.touched"
            />
            <app-form-error [control]="form.controls.name" label="اسم التصنيف" />
          </div>
          <div class="col-12">
            <label class="form-label">ملاحظات</label>
            <textarea class="form-control" rows="2" formControlName="notes" placeholder="(اختياري)"></textarea>
          </div>
        </div>

        @if (serverError(); as msg) {
          <div class="alert alert-danger mt-3 mb-0" role="alert" style="font-size:11px">{{ msg }}</div>
        }
      </form>

      <ng-container modal-footer>
        <button type="button" class="btn" [disabled]="submitting()" (click)="close()">إلغاء</button>
        <button
          type="button"
          class="btn btn-bl d-inline-flex align-items-center gap-2"
          [disabled]="submitting() || form.invalid"
          (click)="submit()"
        >
          @if (submitting()) {
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          }
          <span>{{ submitting() ? 'جاري الحفظ...' : (isEdit() ? 'حفظ التعديلات' : 'إضافة') }}</span>
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class CapitalClassificationFormModalComponent {
  readonly open = input.required<boolean>();
  readonly classification = input<CapitalClassification | null>(null);

  readonly closed = output<void>();
  readonly saved = output<CapitalClassification>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CapitalClassificationsService);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.classification() !== null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    notes: [''],
  });

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        const c = this.classification();
        this.submitting.set(false);
        this.serverError.set(null);
        this.form.reset({ name: c?.name ?? '', notes: c?.notes ?? '' });
      },
      { allowSignalWrites: true },
    );
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = { name: raw.name.trim(), notes: raw.notes.trim() || null };
    const editing = this.classification();
    const request$ = editing
      ? this.service.update(editing.id, payload)
      : this.service.create(payload);

    this.serverError.set(null);
    this.submitting.set(true);
    request$.subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.toast.success(editing ? 'تم حفظ تعديلات التصنيف' : 'تمت إضافة التصنيف بنجاح');
        this.saved.emit(res);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(apiErrorToMessage(err, 'تعذّر حفظ التصنيف'));
      },
    });
  }

  protected close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }
}
