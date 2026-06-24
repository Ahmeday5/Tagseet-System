import {
  Component,
  Input,
  OnInit,
  signal,
  computed,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractDetails } from '../../../customers/models/client-statement.model';
import { ContractsService } from '../../services/contracts.service';

@Component({
  selector: 'app-contract-print-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contract-print-modal.component.html',
  styleUrl: './contract-print-modal.component.scss',
})
export class ContractPrintModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) contractId!: number;
  @Input({ required: true }) onClose!: () => void;

  private readonly contractsService = inject(ContractsService);

  details = signal<ContractDetails | null>(null);
  loading = signal(true);
  error = signal(false);

  protected readonly today = new Date();

  protected readonly totalAmount = computed(() => {
    const d = this.details();
    if (!d) return 0;
    return d.summary.totalContractAmount;
  });

  protected readonly remainingAfterInstallment = computed(() => {
    const d = this.details();
    if (!d) return (_seq: number) => 0;
    const inst = d.contract.installmentAmount;
    const total = d.summary.totalContractAmount;
    return (seq: number) => Math.max(0, total - seq * inst);
  });

  ngOnInit(): void {
    this.contractsService.getDetails(this.contractId).subscribe({
      next: (data) => {
        this.details.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
  }

  print(): void {
    window.print();
  }

  frequencyLabel(freq: string): string {
    const map: Record<string, string> = {
      Monthly: 'شهري',
      Quarterly: 'ربع سنوي',
      SemiAnnual: 'نصف سنوي',
    };
    return map[freq] ?? freq;
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  }

  installmentDueDate(firstDate: string, index: number, freq: string): string {
    if (!firstDate) return '';
    const d = new Date(firstDate);
    const months =
      freq === 'Monthly' ? 1 : freq === 'Quarterly' ? 3 : 6;
    d.setMonth(d.getMonth() + index * months);
    return this.formatDate(d.toISOString());
  }
}
