/**
 * BookingApiService
 *
 * HTTP layer for all booking-domain API calls.
 * Kept separate from FlightApiService because:
 * - Booking is a distinct backend domain (separate controller, DB tables)
 * - Single Responsibility: each service owns one domain
 * - If we add cancellation (Phase 3), it belongs here, not in FlightApiService
 *
 * Components inject this service — they never use HttpClient directly.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateBookingRequest, BookingApiResponse } from '../models/booking.models';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * POST /api/bookings
   *
   * Creates a booking. The request MUST include:
   * - offerId         (from the selected FlightOffer)
   * - idempotencyKey  (UUID generated ONCE per booking attempt — reused on retry)
   * - travellers      (at least one passenger)
   * - contactInfo     (email + phone)
   * - paymentMethod   ("MOCK" for assessment)
   * - acceptedPriceChange (true only if user explicitly accepted a PRICE_CHANGED fare)
   *
   * The backend enforces revalidation server-side — it will 400 if the offer
   * was never revalidated, even if Angular skips the check.
   */
  createBooking(request: CreateBookingRequest): Observable<BookingApiResponse> {
    return this.http.post<BookingApiResponse>(
      `${this.baseUrl}/api/bookings`,
      request,
    );
  }

  /**
   * GET /api/bookings/:ref
   * Fetch a booking by its booking reference (e.g. "TXG-490197").
   */
  getBookingByRef(ref: string): Observable<BookingApiResponse> {
    return this.http.get<BookingApiResponse>(
      `${this.baseUrl}/api/bookings/${ref}`,
    );
  }
}
