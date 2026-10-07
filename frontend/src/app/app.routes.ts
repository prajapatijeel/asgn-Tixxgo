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
  // ── Booking flow ──────────────────────────────────────────────────────
  // IMPORTANT: specific paths (traveller, confirmation) MUST come before
  // the parameterised route (:bookingRef) or Angular will match them as
  // a bookingRef value instead of the intended component.
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
    path: 'bookings',
    loadComponent: () =>
      import('./features/booking/pages/my-bookings/my-bookings.component').then(
        (m) => m.MyBookingsComponent,
      ),
  },
  {
    // Dynamic route — must come AFTER static booking/* routes
    path: 'booking/:bookingRef',
    loadComponent: () =>
      import('./features/booking/pages/details/booking-details.component').then(
        (m) => m.BookingDetailsComponent,
      ),
  },
  {
    // Catch-all: redirect unknown URLs back to search
    path: '**',
    redirectTo: 'flights/search',
  },
];

