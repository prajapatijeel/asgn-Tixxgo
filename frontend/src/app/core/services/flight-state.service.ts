/**
 * FlightStateService
 *
 * Lightweight in-memory state service that shares data between the
 * Search page and the Results page without NgRx or other heavy libraries.
 *
 * Why not just use a route parameter or localStorage?
 * - The flight offer list can be large (multiple offers with full pricing).
 * - We do not want to serialize complex objects into the URL.
 * - localStorage would require JSON serialisation and is unnecessary for
 *   a single-session workflow.
 *
 * Pattern: BehaviorSubject (from RxJS)
 * - Always holds the latest value.
 * - New subscribers immediately receive the current value.
 * - Components subscribe as Observables (read-only via asObservable()).
 * - Only this service can write to the subjects (encapsulation).
 *
 * What this service is NOT:
 * - Not NgRx. No reducers, no effects, no selectors.
 * - Not a persistent store. Data is lost on page refresh (intentional for Phase 1).
 *
 * Future: In Phase 2 (booking), the selectedOffer and revalidationState
 * will feed directly into the CreateBookingDto.
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FlightOffer, RevalidationState } from '../models/flight.models';

@Injectable({ providedIn: 'root' })
export class FlightStateService {
  // ── Search results ───────────────────────────────────────────────
  private readonly _offers = new BehaviorSubject<FlightOffer[]>([]);

  /** Read-only stream of search results. */
  readonly offers$: Observable<FlightOffer[]> = this._offers.asObservable();

  setOffers(offers: FlightOffer[]): void {
    this._offers.next(offers);
  }

  getOffers(): FlightOffer[] {
    return this._offers.getValue();
  }

  // ── Selected offer ───────────────────────────────────────────────
  private readonly _selectedOffer = new BehaviorSubject<FlightOffer | null>(null);

  readonly selectedOffer$: Observable<FlightOffer | null> = this._selectedOffer.asObservable();

  setSelectedOffer(offer: FlightOffer): void {
    // Clear any previous revalidation state when a new offer is selected
    this._revalidationState.next(null);
    this._selectedOffer.next(offer);
  }

  getSelectedOffer(): FlightOffer | null {
    return this._selectedOffer.getValue();
  }

  // ── Revalidation state ───────────────────────────────────────────
  private readonly _revalidationState = new BehaviorSubject<RevalidationState | null>(null);

  readonly revalidationState$: Observable<RevalidationState | null> =
    this._revalidationState.asObservable();

  setRevalidationState(state: RevalidationState): void {
    this._revalidationState.next(state);
  }

  acceptPriceChange(): void {
    const current = this._revalidationState.getValue();
    if (current) {
      this._revalidationState.next({ ...current, priceAccepted: true });
    }
  }

  getRevalidationState(): RevalidationState | null {
    return this._revalidationState.getValue();
  }

  // ── Reset ────────────────────────────────────────────────────────
  /** Call this before a fresh search to clear stale data. */
  clearAll(): void {
    this._offers.next([]);
    this._selectedOffer.next(null);
    this._revalidationState.next(null);
  }
}
