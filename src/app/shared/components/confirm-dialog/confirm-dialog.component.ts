import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  protected readonly dialog = inject(DialogService);

  confirm(): void {
    this.dialog.handleResponse(true);
  }

  close(): void {
    this.dialog.handleResponse(false);
  }

  getTitleStyle(): string {
    const map: Record<string, string> = {
      danger:  'color: var(--re)',
      warning: 'color: var(--am)',
      info:    'color: var(--bl)',
    };
    return map[this.dialog.state().config.type ?? 'danger'] ?? '';
  }

  getConfirmBtnClass(): string {
    const map: Record<string, string> = {
      danger:  'btn btn-re',
      warning: 'btn btn-am',
      info:    'btn btn-bl',
    };
    return map[this.dialog.state().config.type ?? 'danger'] ?? 'btn btn-re';
  }
}
