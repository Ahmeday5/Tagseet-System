import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Restricts a route to users who hold every listed permission (or `all`).
 *
 *   { path: 'reports', canActivate: [authGuard, permissionGuard(['reports.view'])], ... }
 */
export const permissionGuard = (
  required: string | ReadonlyArray<string>,
): CanActivateFn => () => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/auth/login']);
  }

  const list = Array.isArray(required) ? required : [required as string];
  if (auth.hasPermission(list)) return true;

  toast.error('ليس لديك صلاحية للوصول إلى هذه الصفحة');
  return router.createUrlTree(['/dashboard']);
};
