import { Routes } from '@angular/router';

/**
 * Application routes.
 *
 * loadComponent() = lazy loading.
 * Each page is loaded as a separate JS chunk only when the user navigates to it.
 * This keeps the initial bundle small.
 *
 * Why lazy loading matters in an interview:
 * - Faster initial load time (only the search page JS loads upfront).
 * - The results page chunk downloads only when the user actually gets results.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'flights/search',
    pathMatch: 'full',
  },
  {
    path: 'flights/search',
    loadComponent: () =>
      import('./features/flights/pages/flight-search/flight-search.component').then(
        (m) => m.FlightSearchComponent,
      ),
  },
  {
    path: 'flights/results',
    loadComponent: () =>
      import('./features/flights/pages/flight-results/flight-results.component').then(
        (m) => m.FlightResultsComponent,
      ),
  },
  {
    path: 'booking/traveller',
    loadComponent: () =>
      import('./features/booking/pages/traveller/traveller.component').then(
        (m) => m.TravellerComponent,
      ),
  },
  {
    path: 'booking/confirmation',
    loadComponent: () =>
      import('./features/booking/pages/confirmation/confirmation.component').then(
        (m) => m.ConfirmationComponent,
      ),
  },
  {
    // Catch-all: redirect unknown URLs back to search
    path: '**',
    redirectTo: 'flights/search',
  },
];
