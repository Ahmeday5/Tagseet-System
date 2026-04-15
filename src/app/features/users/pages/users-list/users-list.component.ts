import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { DateArPipe } from '../../../../shared/pipes/date-ar.pipe';
import { UsersService } from '../../services/users.service';
import { SystemUser, ROLE_LABELS, PERMISSION_GROUPS } from '../../models/user-management.model';
import { UserRole } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-users-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, DateArPipe],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  private readonly usersService = inject(UsersService);

  protected readonly users = signal<SystemUser[]>([]);
  protected readonly permissionGroups = PERMISSION_GROUPS;

  ngOnInit(): void {
    this.usersService.getAll().subscribe((users) => this.users.set(users));
  }

  protected getRoleLabel(role: UserRole): string {
    return ROLE_LABELS[role];
  }

  protected getRoleBadge(role: UserRole): 'bad' | 'warn' | 'ok' | 'info' {
    const map: Record<UserRole, 'bad' | 'warn' | 'ok' | 'info'> = {
      admin: 'bad', manager: 'warn', cashier: 'ok', viewer: 'info',
    };
    return map[role];
  }
}
