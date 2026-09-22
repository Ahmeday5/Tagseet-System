import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Generic placeholder for pages not built yet. Drop it into any routed
 * component's template with an optional custom title/subtitle so the page
 * still renders something meaningful in the sidebar/router-outlet flow.
 */
@Component({
  selector: 'app-under-construction',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './under-construction.component.html',
  styleUrl: './under-construction.component.scss',
})
export class UnderConstructionComponent {
  title = input('الصفحة قيد التطوير');
  subtitle = input('نعمل حاليًا على تجهيز هذه الشاشة، وستكون متاحة قريبًا.');
}
