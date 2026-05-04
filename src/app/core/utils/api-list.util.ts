import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
