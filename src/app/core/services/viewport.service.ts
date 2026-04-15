import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  init(): void {
    const update = () => {
      document.documentElement.style.setProperty(
        '--app-height',
        `${window.innerHeight}px`
      );
    };

    update();
    window.addEventListener('resize', update);
  }
}
