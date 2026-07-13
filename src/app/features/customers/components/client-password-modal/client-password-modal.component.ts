import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { CustomersService } from '../../services/customers.service';
import { DashboardClient } from '../../models/dashboard-client.model';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-client-password-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    PasswordInputComponent,
  ],
  templateUrl: './client-password-modal.component.html',
})
export class ClientPasswordModalComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();
  readonly client = input<DashboardClient | null>(null);

  // ── outputs ──
  readonly closed = output<void>();
  readonly saved = output<void>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CustomersService);
  private readonly toast = inject(ToastService);

  // ── template-bound state ──
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  // ── form ──
  protected readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  constructor() {
    effect(
      () => {
        if (!this.open()) return;
        this.serverError.set(null);
        this.submitting.set(false);
        this.form.reset({ newPassword: '', confirmPassword: '' });
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

    const target = this.client();
    if (!target) return;

    this.serverError.set(null);
    this.submitting.set(true);

    this.service
      .changeClientPassword(target.id, {
        newPassword: this.form.getRawValue().newPassword,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success(`تم تغيير كلمة مرور "${target.fullName}" بنجاح`);
          this.saved.emit();
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.serverError.set(err.message || 'تعذّر تغيير كلمة المرور');
        },
      });
  }

  protected close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  protected isInvalid(field: 'newPassword' | 'confirmPassword'): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  protected showMismatch(): boolean {
    const confirm = this.form.controls.confirmPassword;
    return (
      this.form.hasError('passwordMismatch') &&
      (confirm.dirty || confirm.touched) &&
      !confirm.invalid
    );
  }
}
