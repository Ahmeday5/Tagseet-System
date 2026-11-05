import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ProfitExplanationsStore } from '../profit-explanations.store';

const TIP_WIDTH = 280;
const VIEWPORT_GUTTER = 8;

let nextId = 0;

/**
 * (i) icon that reveals how a figure is computed. Content comes from the
 * backend's `explanations` (matched by `field`), falling back to the static
 * hint when the backend has none. Renders nothing when neither exists.
 *
 * The bubble is `position: fixed` so it escapes the horizontally scrolling
 * tables instead of being clipped by them. Hover/focus shows it; click pins
 * it (touch devices).
 */
@Component({
  selector: 'app-profit-info',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (content(); as c) {
      <button
        type="button"
        class="pi-btn"
        [attr.aria-label]="'طريقة الحساب: ' + c.title"
        [attr.aria-describedby]="open() ? tipId : null"
        [attr.aria-expanded]="pinned()"
        (mouseenter)="show()"
        (mouseleave)="hideUnlessPinned()"
        (focus)="show()"
        (blur)="hide()"
        (click)="togglePin($event)"
        (keydown.escape)="hide()"
      >i</button>

      @if (open()) {
        <span
          role="tooltip"
          class="pi-tip"
          [id]="tipId"
          [style.top.px]="pos().top"
          [style.left.px]="pos().left"
          [style.width.px]="width"
        >
          @if (c.title) {
            <strong class="pi-title">{{ c.title }}</strong>
          }
          <span class="pi-formula">{{ c.formula }}</span>
        </span>
      }
    }
  `,
  styleUrl: './profit-info.component.scss',
  host: {
    '(window:resize)': 'hide()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class ProfitInfoComponent {
  /** Backend explanation path, e.g. `MonthlySalesProfits.NetProfit`. */
  readonly field = input.required<string>();
  /** Used when the backend sends no explanation for `field`. */
  readonly fallback = input<string>('');

  private readonly store = inject(ProfitExplanationsStore, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly tipId = `profit-info-${nextId++}`;
  protected readonly width = TIP_WIDTH;
  protected readonly open = signal(false);
  protected readonly pinned = signal(false);
  protected readonly pos = signal({ top: 0, left: 0 });

  protected readonly content = computed(() => {
    const e = this.store?.get(this.field());
    if (e?.formula) return { title: e.title, formula: e.formula };
    const fallback = this.fallback();
    return fallback ? { title: '', formula: fallback } : null;
  });

  constructor() {
    // The app scrolls inside nested containers, not the window — listen in
    // the capture phase so any scroll ancestor detaches the fixed bubble.
    const onScroll = (): void => {
      if (this.open()) this.hide();
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('scroll', onScroll, { capture: true }),
    );
  }

  protected show(): void {
    const btn = this.host.nativeElement.querySelector('.pi-btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const maxLeft = window.innerWidth - TIP_WIDTH - VIEWPORT_GUTTER;
    const left = Math.min(
      Math.max(r.left + r.width / 2 - TIP_WIDTH / 2, VIEWPORT_GUTTER),
      Math.max(maxLeft, VIEWPORT_GUTTER),
    );
    this.pos.set({ top: r.bottom + 6, left });
    this.open.set(true);
  }

  protected hide(): void {
    this.open.set(false);
    this.pinned.set(false);
  }

  protected hideUnlessPinned(): void {
    if (!this.pinned()) this.open.set(false);
  }

  protected togglePin(event: MouseEvent): void {
    // Keep row-click handlers (e.g. month details) from firing.
    event.stopPropagation();
    if (this.pinned()) {
      this.hide();
    } else {
      this.show();
      this.pinned.set(true);
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.pinned() && !this.host.nativeElement.contains(event.target as Node)) {
      this.hide();
    }
  }
}
