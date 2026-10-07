import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateBookingRequest,
  BookingApiResponse,
  CancelBookingRequest,
  CancellationPreviewApiResponse,
  BookingListApiResponse,
} from '../models/booking.models';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * POST /api/bookings
   * Creates a booking. Requires a revalidated offer and explicit price acceptance if changed.
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
   * Note: the backend route uses :ref to accept the booking reference string.
   */
  getBookingByRef(ref: string): Observable<BookingApiResponse> {
    return this.http.get<BookingApiResponse>(
      `${this.baseUrl}/api/bookings/${ref}`,
    );
  }

  /** GET /api/bookings - demo/admin list of the bookings currently available. */
  getBookings(): Observable<BookingListApiResponse> {
    return this.http.get<BookingListApiResponse>(`${this.baseUrl}/api/bookings`);
  }

  /**
   * GET /api/bookings/:id/cancel-preview
   * Shows the customer cancellation charge + estimated refund BEFORE confirming.
   * Uses the booking's internal UUID (booking.id), NOT the bookingRef.
   */
  getCancellationPreview(bookingId: string): Observable<CancellationPreviewApiResponse> {
    return this.http.get<CancellationPreviewApiResponse>(
      `${this.baseUrl}/api/bookings/${bookingId}/cancel-preview`,
    );
  }

  /**
   * POST /api/bookings/:id/cancel
   * Cancels the booking. Uses the booking's internal UUID (booking.id).
   * Body: { reason?: string }  — matches backend CancelBookingDto exactly.
   * Returns the updated Booking with status CANCELLED and paymentStatus REFUND_PENDING.
   */
  cancelBooking(bookingId: string, request: CancelBookingRequest): Observable<BookingApiResponse> {
    return this.http.post<BookingApiResponse>(
      `${this.baseUrl}/api/bookings/${bookingId}/cancel`,
      request,
    );
  }
}

