import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PagedResponse } from '../models/api-response.model';

/**
 * Coerces any list-shaped response into a plain array. Tolerates every
 * shape we've seen from this backend so a single rogue endpoint doesn't
 * blow up the @for that consumes it:
 *
 *   - `T[]`                                      → as-is
 *   - `{ data: T[], pageIndex, count, ... }`     → full paged envelope
 *   - `{ items: T[], total, ... }`               → lite paginated wrapper
 *   - anything else (null, 404, error body, …)   → `[]`
 *
 * Use the rxjs operator wrapper `toList<T>()` instead of calling this
 * directly when piping a service observable — it's the same logic but
 * keeps the `.pipe()` chain readable.
 */
export function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const data = (value as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
    const items = (value as { items?: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return [];
}

/**
 * RxJS operator: normalize a list-shaped response stream to `T[]`.
 *
 *   this.api.get<unknown>(url).pipe(toList<Product>())
 */
export function toList<T>() {
  return (source$: Observable<unknown>): Observable<T[]> =>
    source$.pipe(map((v) => asList<T>(v)));
}

const EMPTY_PAGED: PagedResponse<never> = {
  pageIndex: 1,
  pageSize: 0,
  count: 0,
  totalPages: 0,
  data: [],
};

/**
 * Normalizes any "paged" response shape into a canonical `PagedResponse<T>`.
 *
 *   - `{ pageIndex, pageSize, count, totalPages, data: [...] }` → as-is
 *   - `{ data: { pageIndex, ..., data: [...] } }`               → unwrap once
 *     (defensive: catches doubly-wrapped envelopes that slip past `ApiService.unwrap`)
 *   - `T[]`                                                     → wrap as single page
 *   - anything else (null, error body, missing fields, …)       → empty page
 *
 * Pair with `toPaged<T>()` when piping a service observable.
 */
export function asPaged<T>(value: unknown): PagedResponse<T> {
  if (!value || typeof value !== 'object') {
    return Array.isArray(value)
      ? { ...EMPTY_PAGED, pageSize: value.length, count: value.length, totalPages: 1, data: value as T[] }
      : { ...EMPTY_PAGED, data: [] as T[] };
  }

  const candidate = value as Partial<PagedResponse<T>> & { data?: unknown };

  if (Array.isArray(candidate.data)) {
    return {
      pageIndex: typeof candidate.pageIndex === 'number' ? candidate.pageIndex : 1,
      pageSize: typeof candidate.pageSize === 'number' ? candidate.pageSize : candidate.data.length,
      count: typeof candidate.count === 'number' ? candidate.count : candidate.data.length,
      totalPages: typeof candidate.totalPages === 'number' ? candidate.totalPages : 1,
      data: candidate.data as T[],
    };
  }

  // Defensive: doubly-wrapped envelope where the inner `data` is itself a paged shape.
  if (candidate.data && typeof candidate.data === 'object') {
    return asPaged<T>(candidate.data);
  }

  return { ...EMPTY_PAGED, data: [] as T[] };
}

/**
 * RxJS operator: normalize a paged response stream to `PagedResponse<T>`.
 *
 *   this.api.get<unknown>(url).pipe(toPaged<Transfer>())
 */
export function toPaged<T>() {
  return (source$: Observable<unknown>): Observable<PagedResponse<T>> =>
    source$.pipe(map((v) => asPaged<T>(v)));
}
