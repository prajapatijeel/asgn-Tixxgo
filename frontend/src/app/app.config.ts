import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

/**
 * Application-level providers.
 *
 * provideHttpClient() — registers the Angular HttpClient in the DI container.
 * Without this, any service that injects HttpClient throws a runtime error.
 * In Angular 18 standalone apps this replaces the old HttpClientModule import.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
  ],
};
