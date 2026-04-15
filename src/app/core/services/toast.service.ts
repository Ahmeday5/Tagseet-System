import { Injectable, signal } from '@angular/core';
import { generateUUID } from '../../shared/utils/uuid.util';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  success(message: string, duration = 3000): void {
    this.show('success', message, duration);
  }

  error(message: string, duration = 5000): void {
    this.show('error', message, duration);
  }

  warning(message: string, duration = 4000): void {
    this.show('warning', message, duration);
  }

  info(message: string, duration = 3000): void {
    this.show('info', message, duration);
  }

  dismiss(id: string): void {
    this.toastsSignal.update((ts) => ts.filter((t) => t.id !== id));
  }

  private show(type: ToastType, message: string, duration: number): void {
    const id = generateUUID();
    const toast: Toast = { id, type, message, duration };

    this.toastsSignal.update((ts) => [...ts, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }
}
