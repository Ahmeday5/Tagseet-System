import { effect } from '@angular/core';
import { HttpCacheService } from '../services/http-cache.service';

/**
 * Wires a page-level refetch to the global cache-invalidation signal.
 *
 *   constructor() {
 *     onInvalidate(this.cache, 'treasury', () => this.refresh());
 *   }
 *
 *   - `pattern` is matched via `includes()` against EVERY pattern in the
 *     triggering event's `patterns` array (not just the single legacy
 *     `pattern` field — a batched `invalidateMany()` call fires one event
 *     covering all of its patterns, and a page may care about any one of
 *     them), so the consuming page can be loose ("treasury") while
 *     services use specific patterns ("treasury", "treasuries", …).
 *   - The first effect run (initial signal value) is intentionally a
 *     no-op via the empty-`patterns` guard, so the page doesn't refetch
 *     on first render — it already does that explicitly via ngOnInit.
 *   - Must be called from an injection context (constructor / field
 *     initializer) because it sets up an `effect()`.
 */
export function onInvalidate(
  cache: HttpCacheService,
  pattern: string,
  refetch: () => void,
): void {
  effect(
    () => {
      const event = cache.invalidations();
      if (!event.patterns.length) return; // initial / unrelated event — skip
      if (!event.patterns.some((p) => p.includes(pattern))) return;
      refetch();
    },
    { allowSignalWrites: true },
  );
}
