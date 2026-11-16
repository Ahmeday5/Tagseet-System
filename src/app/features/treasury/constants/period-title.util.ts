/**
 * Builds a period-aware card title so a figure computed over a filtered date
 * range reads unambiguously — e.g. `صافي الرصيد من 2026-01-01 إلى 2026-03-31`.
 * With no dates it returns the plain label.
 */
export function periodTitle(base: string, from: string, to: string): string {
  if (from && to) return `${base} من ${from} إلى ${to}`;
  if (from) return `${base} من ${from}`;
  if (to) return `${base} حتى ${to}`;
  return base;
}
