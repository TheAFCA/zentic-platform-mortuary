import { Component, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Sentry from '@sentry/angular';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('web');
  protected readonly isDev = signal(!environment.production);
  protected readonly sentryReady = signal(Boolean(environment.sentryDsn));
  protected readonly lastResult = signal('');

  constructor(private readonly http: HttpClient) {}

  protected triggerFrontendTest() {
    if (!this.sentryReady()) {
      this.lastResult.set('Configura `sentryDsn` para enviar eventos.');
      return;
    }

    Sentry.captureException(new Error('Local Sentry test from web'));
    this.lastResult.set('Evento frontend enviado a Sentry.');
  }

  protected triggerBackendTest() {
    this.http.post(`${environment.apiUrl}/dev/sentry-test`, {}).subscribe({
      next: () => {
        this.lastResult.set('No debería llegar al éxito; revisa la respuesta.');
      },
      error: () => {
        this.lastResult.set('Evento backend enviado a Sentry.');
      },
    });
  }
}
