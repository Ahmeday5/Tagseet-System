import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoaderService);

  // لا تُظهر اللودر لطلبات الخلفية (مثل Refresh Token)
  const skipLoader = req.headers.has('X-Skip-Loader');
  if (skipLoader) return next(req);

  loader.show();
  return next(req).pipe(finalize(() => loader.hide()));
};
