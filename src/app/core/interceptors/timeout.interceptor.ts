import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { timeout, catchError, throwError } from 'rxjs';

/**
 * Caps how long any request may hang with no response.
 *
 * Without this, a request against a cold/recycling backend process (e.g. a
 * `runasp.net` free-tier app pool waking up after idle) that stalls instead
 * of erroring cleanly leaves its Observable never emitting `next` OR `error`
 * — any `detailsLoading`/`submitting` flag gated on that subscription's
 * callbacks then stays `true` forever, so the UI just spins indefinitely.
 * This is far more visible on mobile: backgrounding the tab between visits
 * is exactly the idle gap that lets the app pool recycle, so the very next
 * request is the one that hits a cold start.
 *
 * A timed-out request rejects as a plain `HttpErrorResponse` (status 0) so
 * it flows through `errorInterceptor` exactly like a network failure —
 * every existing `error:` handler already deals with that.
 */
const REQUEST_TIMEOUT_MS = 30_000;

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    timeout(REQUEST_TIMEOUT_MS),
    catchError((err) => {
      if (err?.name === 'TimeoutError') {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 0,
              statusText: 'Timeout',
              url: req.urlWithParams,
              error: { message: 'انتهت مهلة الاتصال بالخادم' },
            }),
        );
      }
      return throwError(() => err);
    }),
  );
};
