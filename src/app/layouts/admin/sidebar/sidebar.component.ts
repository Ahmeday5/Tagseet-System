import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { BADGE_CLASS_MAP, BadgeType } from '../../../core/constants/badge.constants';
import { getMappedClass } from '../../../core/utils/class-map.util';
import { NAV_SECTIONS } from '../../../core/constants/nav.constants';
import { NavIconComponent, NavIconName } from '../../../shared/components/nav-icon/nav-icon.component';

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: NavIconName;
  badge?: string;
  badgeType?: 'red' | 'amber' | 'green' | 'whatsapp';
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, NavIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  protected readonly layout = inject(LayoutService);

  readonly navSections = NAV_SECTIONS;

  
  getBadgeClass(type?: BadgeType): string {
    return getMappedClass(BADGE_CLASS_MAP, type ?? 'red', 'red');
  }
}
