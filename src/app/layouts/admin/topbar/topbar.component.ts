import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { UserRole } from '../../../core/models/auth.model';

const ROLE_LABELS: Record<UserRole, string> = {
  admin:   'مدير عام',
  manager: 'مدير',
  cashier: 'محاسب',
  viewer:  'مشاهد',
};

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly authService = inject(AuthService);
  protected readonly layout = inject(LayoutService);

  protected readonly searchQuery  = signal('');
  protected readonly currentUser  = this.authService.currentUser;

  onSearch(): void {
    // TODO: global search
  }

  logout(): void {
    this.authService.logout();
  }

  getRoleLabel(): string {
    const role = this.currentUser()?.role;
    return role ? ROLE_LABELS[role] : '';
  }
}
