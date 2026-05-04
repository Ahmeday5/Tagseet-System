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
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { ApiError } from '../../../../core/models/api-response.model';
import { ToastService } from '../../../../core/services/toast.service';
import { Warehouse } from '../../../warehouse/models/warehouse.model';
import { WarehouseService } from '../../../warehouse/services/warehouse.service';
import { Treasury } from '../../../treasury/models/treasury.model';
import { TreasuryService } from '../../../treasury/services/treasury.service';
import {
  ClientOrder,
  ConvertToContractPayload,
} from '../../models/catalog.model';
import { CatalogService } from '../../services/catalog.service';

/**
 * Modal that captures the extra fields needed to convert a client order
 * into a real installment contract.
 *
 *   <app-convert-to-contract-modal
 *     [open]="modalOpen()"
 *     [order]="selectedOrder()"
 *     (closed)="closeModal()"
 *     (converted)="onConverted($event)" />
 *
 * The order itself comes from the parent (already fetched). Warehouses
 * and treasuries are loaded lazily on first open and cached by their
 * own services.
 */
@Component({
  selector: 'app-convert-to-contract-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    CurrencyArPipe,
  ],
  templateUrl: './convert-to-contract-modal.component.html',
  styleUrl: './convert-to-contract-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConvertToContractModalComponent {
  // ── inputs ──
  readonly open = input.required<boolean>();
  readonly order = input<ClientOrder | null>(null);

  // ── outputs ──
  readonly closed = output<void>();
  readonly converted = output<ClientOrder>();

  // ── deps ──
  private readonly fb = inject(FormBuilder);
  private readonly catalogService = inject(CatalogService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly toast = inject(ToastService);

  // ── reactive state ──
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly treasuries = signal<Treasury[]>([]);
  protected readonly loadingRefs = signal(false);

  protected readonly activeWarehouses = computed(() =>
    this.warehouses().filter((w) => w.isActive),
  );
  protected readonly activeTreasuries = computed(() =>
    this.treasuries().filter((t) => t.isActive),
  );

  protected readonly title = 'تحويل الطلب إلى عقد';

  // ── form ──
  protected readonly form = this.fb.nonNullable.group({
    warehouseId: [0, [Validators.required, Validators.min(1)]],
    treasuryId: [0, [Validators.required, Validators.min(1)]],
    purchaseDate: ['', [Validators.required]],
    firstInstallmentDate: ['', [Validators.required]],
    notes: [''],
  });

  constructor() {
    effect(
      () => {
        if (!this.open()) return;

        this.serverError.set(null);
        this.submitting.set(false);
        this.resetFormDefaults();
        this.loadRefsIfNeeded();
      },
      { allowSignalWrites: true },
    );
  }

  // ─────────────── public template handlers ───────────────

  protected onSubmit(): void {
    if (this.submitting()) return;

    const order = this.order();
    if (!order) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: ConvertToContractPayload = {
      warehouseId: Number(raw.warehouseId),
      treasuryId: Number(raw.treasuryId),
      purchaseDate: this.toIso(raw.purchaseDate),
      firstInstallmentDate: this.toIso(raw.firstInstallmentDate),
      notes: raw.notes?.trim() ?? '',
    };

    this.serverError.set(null);
    this.submitting.set(true);

    this.catalogService
      .convertClientOrderToContract(order.id, payload)
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success(
            `تم تحويل طلب ${order.clientName} إلى عقد بنجاح`,
          );
          this.converted.emit(order);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.serverError.set(
            err.message || 'حدث خطأ أثناء تحويل الطلب — حاول مرة أخرى',
          );
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

  private resetFormDefaults(): void {
    const today = this.toLocalDateTimeInput(new Date());
    const inOneMonth = this.toLocalDateTimeInput(this.addMonths(new Date(), 1));
    this.form.reset({
      warehouseId: 0,
      treasuryId: 0,
      purchaseDate: today,
      firstInstallmentDate: inOneMonth,
      notes: '',
    });
  }

  private loadRefsIfNeeded(): void {
    if (this.warehouses().length > 0 && this.treasuries().length > 0) return;

    this.loadingRefs.set(true);
    this.warehouseService.list().subscribe({
      next: (list) => this.warehouses.set(list ?? []),
      error: () => this.warehouses.set([]),
    });
    this.treasuryService.list().subscribe({
      next: (list) => {
        this.treasuries.set(list ?? []);
        this.loadingRefs.set(false);
      },
      error: () => {
        this.treasuries.set([]);
        this.loadingRefs.set(false);
      },
    });
  }

  /** Converts an `<input type="datetime-local">` value to an ISO string. */
  private toIso(value: string): string {
    if (!value) return new Date().toISOString();
    // datetime-local strings are local-time without TZ — `new Date(...)`
    // interprets them as local, then `.toISOString()` converts to UTC.
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? new Date().toISOString()
      : d.toISOString();
  }

  /** Formats a Date as `YYYY-MM-DDTHH:mm` for `datetime-local` inputs. */
  private toLocalDateTimeInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  }

  private addMonths(d: Date, months: number): Date {
    const next = new Date(d);
    next.setMonth(next.getMonth() + months);
    return next;
  }
}
