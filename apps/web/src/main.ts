import { bootstrapApplication } from '@angular/platform-browser';
import { init } from '@sentry/angular';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

init({
  dsn: environment.sentryDsn,
  enabled: Boolean(environment.sentryDsn),
  environment: environment.sentryEnvironment,
});

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
