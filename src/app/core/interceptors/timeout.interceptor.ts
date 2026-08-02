import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { timeout, catchError, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints.const';

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
 *
 * `/auth/refresh-token` and `/auth/login` are exempt. A refresh call that
 * times out client-side but actually completed server-side is far worse than
 * a slow spinner: the backend has already rotated the refresh token, but the
 * client discarded that response and keeps the old (now-consumed) token in
 * storage. The next refresh attempt sends that stale token and the backend's
 * reuse-detection kills the whole session ("Refresh token reuse detected"),
 * logging the user out — exactly the cold-start scenario this interceptor
 * exists to survive for every other endpoint. Auth endpoints instead rely on
 * the browser's own connection timeout, however long that takes.
 */
const REQUEST_TIMEOUT_MS = 30_000;

const NO_TIMEOUT_URL_FRAGMENTS: readonly string[] = [
  API_ENDPOINTS.auth.refresh,
  API_ENDPOINTS.auth.login,
];

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  if (NO_TIMEOUT_URL_FRAGMENTS.some((fragment) => req.url.includes(fragment))) {
    return next(req);
  }

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
