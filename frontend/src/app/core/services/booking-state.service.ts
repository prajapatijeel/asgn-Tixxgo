/**
 * BookingStateService
 *
 * Lightweight in-memory state for the booking flow.
 * Follows the exact same BehaviorSubject pattern as FlightStateService.
 *
 * Responsibilities:
 * - Hold the completed Booking result after POST /api/bookings succeeds
 * - Share it between TravellerComponent (writes) and ConfirmationComponent (reads)
 *
 * Why not pass the result via router state or query params?
 * - The Booking object is large (travellers, payment, supplierBooking relations)
 * - Router state is not type-safe in Angular without extra effort
 * - This pattern is consistent with Phase 1's FlightStateService
 *
 * Future (Phase 3): This service can also hold the cancellation preview result.
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Booking } from '../models/booking.models';

@Injectable({ providedIn: 'root' })
export class BookingStateService {
  private readonly _booking = new BehaviorSubject<Booking | null>(null);

  /** Read-only stream of the current booking. */
  readonly booking$: Observable<Booking | null> = this._booking.asObservable();

  setBooking(booking: Booking): void {
    this._booking.next(booking);
  }

  getBooking(): Booking | null {
    return this._booking.getValue();
  }

  clearBooking(): void {
    this._booking.next(null);
  }
}
