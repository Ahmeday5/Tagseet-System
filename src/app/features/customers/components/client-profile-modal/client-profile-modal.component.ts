import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CustomersService } from '../../services/customers.service';
import { ClientProfileClient, ClientProfileResponse } from '../../models/dashboard-client.model';
import { StatementComponent } from '../../pages/statement/statement.component';

@Component({
  selector: 'app-client-profile-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, DatePipe, StatementComponent],
  templateUrl: './client-profile-modal.component.html',
  styleUrl: './client-profile-modal.component.scss',
})
export class ClientProfileModalComponent {
  readonly open = input.required<boolean>();
  readonly clientId = input<number | null>(null);
  readonly closed = output<void>();

  private readonly customersService = inject(CustomersService);

  protected readonly loading = signal(false);
  protected readonly profile = signal<ClientProfileResponse | null>(null);
  protected readonly statementOpen = signal(false);

  constructor() {
    effect(() => {
      const id = this.clientId();
      const isOpen = this.open();
      if (!isOpen || !id) { this.profile.set(null); return; }
      this.loadProfile(id);
    }, { allowSignalWrites: true });

    // Close the statement sub-modal automatically if the profile modal closes.
    effect(() => {
      if (!this.open()) this.statementOpen.set(false);
    }, { allowSignalWrites: true });
  }

  protected openStatement(): void {
    this.statementOpen.set(true);
  }

  protected closeStatement(): void {
    this.statementOpen.set(false);
  }

  private loadProfile(id: number): void {
    this.loading.set(true);
    this.profile.set(null);
    this.customersService.getClientProfile(id).subscribe({
      next: (res) => { this.profile.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase();
  }

  protected formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  protected field(value: string | null | undefined): string {
    return value?.trim() || '—';
  }
}
