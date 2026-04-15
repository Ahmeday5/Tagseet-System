import {
  ChangeDetectionStrategy, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyArPipe } from '../../../../shared/pipes/currency-ar.pipe';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ToastService } from '../../../../core/services/toast.service';
import { RepsService } from '../../services/reps.service';
import { Rep, RepPermission, RepStatus } from '../../models/rep.model';

@Component({
  selector: 'app-reps-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CurrencyArPipe, BadgeComponent],
  templateUrl: './reps-list.component.html',
  styleUrl: './reps-list.component.scss',
})
export class RepsListComponent implements OnInit {
  private readonly svc   = inject(RepsService);
  private readonly fb    = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly reps      = signal<Rep[]>([]);
  protected readonly showForm  = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving    = signal(false);

  protected readonly totalSales      = computed(() => this.reps().reduce((s, r) => s + r.monthlySales,     0));
  protected readonly totalCommission = computed(() => this.reps().reduce((s, r) => s + r.commission,       0));
  protected readonly totalBalance    = computed(() => this.reps().reduce((s, r) => s + r.treasuryBalance,  0));
  protected readonly activeCount     = computed(() => this.reps().filter(r => r.status === 'active').length);

  protected readonly permissions: { value: RepPermission; label: string }[] = [
    { value: 'view',   label: 'عرض فقط'    },
    { value: 'create', label: 'إنشاء عقود'  },
    { value: 'full',   label: 'صلاحيات كاملة' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    name:           ['', Validators.required],
    phone:          ['', Validators.required],
    permissions:    ['view' as RepPermission],
    commissionRate: [5],
    status:         ['active' as RepStatus],
    rating:         [3 as 1 | 2 | 3 | 4 | 5],
  });

  ngOnInit(): void {
    this.svc.getAll().subscribe(r => this.reps.set(r));
  }

  protected openForm(rep?: Rep): void {
    if (rep) {
      this.editingId.set(rep.id);
      this.form.patchValue({
        name: rep.name, phone: rep.phone,
        permissions: rep.permissions, commissionRate: rep.commissionRate,
        status: rep.status, rating: rep.rating,
      });
    } else {
      this.editingId.set(null);
      this.form.reset({ name: '', phone: '', permissions: 'view', commissionRate: 5, status: 'active', rating: 3 });
    }
    this.showForm.set(true);
  }

  protected closeForm(): void { this.showForm.set(false); }

  protected save(): void {
    if (this.form.invalid) return;
    const fv = this.form.getRawValue();
    const monthlySales = 0;
    const commission   = monthlySales * fv.commissionRate / 100;
    const id = this.editingId();

    this.saving.set(true);

    if (id) {
      this.svc.update(id, { ...fv, commission, monthlySales }).subscribe(() => {
        this.reps.update(rs => rs.map(r => r.id === id ? { ...r, ...fv, commission, monthlySales } : r));
        this.toast.success('تم تحديث بيانات المندوب');
        this.saving.set(false);
        this.closeForm();
      });
    } else {
      this.svc.create({ ...fv, commission, monthlySales, treasuryBalance: 0 }).subscribe(newRep => {
        this.reps.update(rs => [newRep, ...rs]);
        this.toast.success('تم إضافة المندوب بنجاح');
        this.saving.set(false);
        this.closeForm();
      });
    }
  }

  protected delete(id: string): void {
    if (!confirm('هل تريد حذف هذا المندوب؟')) return;
    this.svc.delete(id).subscribe(() => {
      this.reps.update(rs => rs.filter(r => r.id !== id));
      this.toast.success('تم حذف المندوب');
    });
  }

  protected stars(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }

  protected getStatusBadge(s: RepStatus): 'ok' | 'warn' | 'bad' {
    const map: Record<RepStatus, 'ok' | 'warn' | 'bad'> = { active: 'ok', leave: 'warn', inactive: 'bad' };
    return map[s];
  }

  protected getStatusLabel(s: RepStatus): string {
    const map: Record<RepStatus, string> = { active: 'نشط', leave: 'إجازة', inactive: 'غير نشط' };
    return map[s];
  }

  protected getPermissionLabel(p: RepPermission): string {
    const map: Record<RepPermission, string> = { view: 'عرض', create: 'إنشاء', full: 'كامل' };
    return map[p];
  }
}
