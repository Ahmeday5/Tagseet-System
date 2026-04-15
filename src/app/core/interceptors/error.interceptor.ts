import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = getErrorMessage(error);

      // لا تعرض رسالة خطأ لطلبات Refresh Token الفاشلة
      if (!req.url.includes('/auth/refresh')) {
        toast.error(message);
      }

      return throwError(() => error);
    })
  );
};

function getErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'تعذّر الاتصال بالخادم، تحقق من اتصال الإنترنت';
  }

  const serverMsg = error.error?.message || error.error?.error;
  if (serverMsg) return serverMsg;

  const messages: Record<number, string> = {
    400: 'بيانات غير صحيحة',
    401: 'غير مصرّح لك بالدخول',
    403: 'ليس لديك صلاحية للقيام بهذا الإجراء',
    404: 'المورد المطلوب غير موجود',
    422: 'فشل التحقق من البيانات',
    429: 'طلبات كثيرة جداً، يرجى الانتظار',
    500: 'خطأ في الخادم، يرجى المحاولة لاحقاً',
    503: 'الخدمة غير متاحة مؤقتاً',
  };

  return messages[error.status] ?? `خطأ غير متوقع (${error.status})`;
}
