import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, filter, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // أضف التوكن إلى رأس الطلب
  const authReq = token ? addToken(req, token) : req;
  
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // معالجة 401 مع منع race condition
      if (error.status === 401 && !req.url.includes('/auth/')) {
        if (!authService.refreshing) {
          authService.refreshing = true;
          authService.refreshSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((res) => {
              authService.refreshing = false;
              authService.refreshSubject.next(res.accessToken);
              return next(addToken(req, res.accessToken));
            }),
            catchError((refreshErr) => {
              authService.refreshing = false;
              authService.logout();
              return throwError(() => refreshErr);
            })
          );
        }

        // انتظر إتمام عملية التحديث الجارية
        return authService.refreshSubject.pipe(
          filter((token) => token !== null),
          take(1),
          switchMap((token) => next(addToken(req, token!)))
        );
      }

      return throwError(() => error);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}
