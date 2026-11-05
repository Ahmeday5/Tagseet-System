import { Injectable, computed, signal } from '@angular/core';
import { ProfitExplanation } from '../../models/treasury.model';

const normalize = (field: string): string => field.trim().toLowerCase();

/**
 * Page-scoped holder for `data.explanations`. Provided by the profits page so
 * every nested block can resolve the formula for the figure it renders
 * without threading the list through inputs.
 *
 * Fields are matched case-insensitively (`MonthlySalesProfits.NetProfit` ≡
 * `monthlySalesProfits.netProfit`).
 */
@Injectable()
export class ProfitExplanationsStore {
  private readonly list = signal<readonly ProfitExplanation[]>([]);
  private readonly byField = computed(
    () => new Map(this.list().map((e) => [normalize(e.field), e])),
  );

  readonly all = this.list.asReadonly();

  set(explanations: readonly ProfitExplanation[] | null | undefined): void {
    this.list.set(explanations ?? []);
  }

  /** Reactive when called inside a computed/template. */
  get(field: string): ProfitExplanation | undefined {
    return this.byField().get(normalize(field));
  }
}
