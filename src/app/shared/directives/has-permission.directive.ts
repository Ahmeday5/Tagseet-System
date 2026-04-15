import { Directive, input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  appHasPermission = input.required<string | string[]>();

  private readonly auth = inject(AuthService);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      const required = this.appHasPermission();
      const perms = user?.permissions ?? [];
      const hasAll = perms.includes('all');

      const granted = hasAll || (
        Array.isArray(required)
          ? required.every((p) => perms.includes(p))
          : perms.includes(required)
      );

      this.vcr.clear();
      if (granted) this.vcr.createEmbeddedView(this.tpl);
    });
  }
}
