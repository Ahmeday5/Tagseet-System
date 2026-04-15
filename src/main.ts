import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { ViewportService } from './app/core/services/viewport.service';

bootstrapApplication(AppComponent, appConfig).then(appRef => {
  const viewport = appRef.injector.get(ViewportService);
  viewport.init();
});
