/**
 * BookingDetailsComponent — /booking/:bookingRef
 *
 * Responsibilities:
 * 1. Load booking data by bookingRef from the URL via BookingApiService
 * 2. Display full booking details (flight, travellers, pricing, status)
 * 3. Show "Cancel Booking" only for CONFIRMED bookings (backend rule)
 * 4. Drive the cancellation preview → confirm → execute flow
 *
 * What this component does NOT do:
 * - Does NOT calculate any charges (backend is source of truth)
 * - Does NOT call the supplier (Angular → NestJS only)
 * - Does NOT mark refunds as completed unless backend says REFUNDED
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BookingApiService } from '../../../../core/services/booking-api.service';
import {
  Booking,
  CancellationPreview,
  CancelBookingRequest,
  CANCELLABLE_STATUSES,
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  BookingStatus,
  PaymentStatus,
} from '../../../../core/models/booking.models';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

type CancellationStep = 'idle' | 'loading-preview' | 'preview' | 'confirming' | 'done' | 'error';

@Component({
  selector: 'app-booking-details',
  standalone: true,
  imports: [CommonModule, DatePipe, HeaderComponent],
  templateUrl: './booking-details.component.html',
  styleUrl: './booking-details.component.css',
})
export class BookingDetailsComponent implements OnInit {
  // ── Booking data ─────────────────────────────────────────────────────
  booking: Booking | null = null;
  isLoading = true;
  loadError: string | null = null;

  // ── Cancellation flow ─────────────────────────────────────────────────
  cancellationStep: CancellationStep = 'idle';
  cancellationPreview: CancellationPreview | null = null;
  cancellationError: string | null = null;

  // Expose helpers to template
  readonly BOOKING_STATUS_LABELS = BOOKING_STATUS_LABELS;
  readonly PAYMENT_STATUS_LABELS = PAYMENT_STATUS_LABELS;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly bookingApi: BookingApiService,
  ) {}

  ngOnInit(): void {
    const bookingRef = this.route.snapshot.paramMap.get('bookingRef');
    if (!bookingRef) {
      this.router.navigate(['/flights/search']);
      return;
    }
    this.loadBooking(bookingRef);
  }

  // ── Load booking ───────────────────────────────────────────────────────
  private loadBooking(bookingRef: string): void {
    this.isLoading = true;
    this.loadError = null;

    this.bookingApi.getBookingByRef(bookingRef).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.booking = response.data;
        } else {
          this.loadError = 'Unable to load booking details.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 404) {
          this.loadError = `Booking "${bookingRef}" was not found. Please check your reference.`;
        } else if (err.status === 0) {
          this.loadError = 'Network error. Please check your connection and try again.';
        } else {
          this.loadError = 'Unable to load booking details. Please try again.';
        }
      },
    });
  }

  // ── UI helpers ─────────────────────────────────────────────────────────
  isCancellable(): boolean {
    if (!this.booking) return false;
    return CANCELLABLE_STATUSES.includes(this.booking.bookingStatus as BookingStatus);
  }

  getBookingStatusLabel(status: string): string {
    return BOOKING_STATUS_LABELS[status as BookingStatus] ?? status;
  }

  getPaymentStatusLabel(status: string): string {
    return PAYMENT_STATUS_LABELS[status as PaymentStatus] ?? status;
  }

  getBookingStatusClass(status: string): string {
    const map: Record<string, string> = {
      CONFIRMED:               'status-success',
      CANCELLED:               'status-danger',
      FAILED:                  'status-danger',
      CANCELLATION_REQUESTED:  'status-warning',
      REFUND_PENDING:          'status-warning',
      SUPPLIER_UNKNOWN:        'status-warning',
    };
    return map[status] ?? 'status-info';
  }

  getPaymentStatusClass(status: string): string {
    const map: Record<string, string> = {
      SUCCESS:        'status-success',
      FAILED:         'status-danger',
      REFUND_PENDING: 'status-warning',
      REFUNDED:       'status-success',
    };
    return map[status] ?? 'status-info';
  }

  formatPrice(amount: number, currency: string): string {
    const symbol = currency === 'INR' ? '₹' : currency;
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  }

  // ── Cancellation flow ──────────────────────────────────────────────────

  /** Step 1: Fetch preview — shows charges before user confirms */
  startCancellation(): void {
    if (!this.booking || !this.isCancellable()) return;

    this.cancellationStep = 'loading-preview';
    this.cancellationError = null;

    this.bookingApi.getCancellationPreview(this.booking.id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cancellationPreview = response.data;
          this.cancellationStep = 'preview';
        } else {
          this.cancellationStep = 'error';
          this.cancellationError = 'Unable to retrieve cancellation charges. Please try again.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.cancellationStep = 'error';
        if (err.status === 400) {
          this.cancellationError = 'This booking cannot be cancelled.';
        } else if (err.status === 0) {
          this.cancellationError = 'Network error. Please try again.';
        } else {
          this.cancellationError = 'Unable to calculate cancellation charges. Please try again.';
        }
      },
    });
  }

  /** Step 2: User clicked "Keep Booking" — dismiss preview */
  keepBooking(): void {
    this.cancellationStep = 'idle';
    this.cancellationPreview = null;
    this.cancellationError = null;
  }

  /** Step 3: User confirmed cancellation — call the cancel API */
  confirmCancellation(): void {
    if (!this.booking) return;

    this.cancellationStep = 'confirming';
    this.cancellationError = null;

    const request: CancelBookingRequest = {
      reason: 'Customer requested cancellation',
    };

    this.bookingApi.cancelBooking(this.booking.id, request).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.booking = response.data; // Update local state with cancelled booking
          this.cancellationStep = 'done';
          this.cancellationPreview = null;
        } else {
          this.cancellationStep = 'error';
          this.cancellationError = 'Cancellation request failed. Please try again.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.cancellationStep = 'error';
        if (err.status === 400 && err.error?.message) {
          this.cancellationError = `Cannot cancel: ${err.error.message}`;
        } else if (err.status === 0) {
          this.cancellationError = 'Network error. Your booking was NOT cancelled. Please try again.';
        } else {
          this.cancellationError = 'Unable to cancel the booking. Please try again or contact support.';
        }
      },
    });
  }

  goBackToSearch(): void {
    this.router.navigate(['/flights/search']);
  }
}
