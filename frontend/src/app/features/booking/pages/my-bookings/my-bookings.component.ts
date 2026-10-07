import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BookingApiService } from '../../../../core/services/booking-api.service';
import {
  BookingStatus,
  BookingSummary,
  BOOKING_STATUS_LABELS,
  CANCELLABLE_STATUSES,
} from '../../../../core/models/booking.models';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, DatePipe, HeaderComponent],
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.css',
})
export class MyBookingsComponent implements OnInit {
  bookings: BookingSummary[] = [];
  searchTerm = '';
  isLoading = true;
  loadError = false;

  readonly BOOKING_STATUS_LABELS = BOOKING_STATUS_LABELS;

  constructor(
    private readonly bookingApi: BookingApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  get filteredBookings(): BookingSummary[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return this.bookings;
    }

    return this.bookings.filter((booking) =>
      [booking.bookingRef, booking.origin, booking.destination]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }

  loadBookings(): void {
    this.isLoading = true;
    this.loadError = false;

    this.bookingApi.getBookings().subscribe({
      next: (response) => {
        this.bookings = response.success && response.data ? response.data : [];
        this.isLoading = false;
      },
      error: (_error: HttpErrorResponse) => {
        this.isLoading = false;
        this.loadError = true;
      },
    });
  }

  updateSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  viewDetails(bookingRef: string): void {
    this.router.navigate(['/booking', bookingRef]);
  }

  manageCancellation(bookingRef: string): void {
    // The existing details page owns the cancellation preview and confirmation flow.
    this.viewDetails(bookingRef);
  }

  searchFlights(): void {
    this.router.navigate(['/flights/search']);
  }

  isCancellable(booking: BookingSummary): boolean {
    return CANCELLABLE_STATUSES.includes(booking.bookingStatus);
  }

  getBookingStatusLabel(status: BookingStatus): string {
    return this.BOOKING_STATUS_LABELS[status] ?? status;
  }

  getBookingStatusClass(status: BookingStatus): string {
    const classes: Partial<Record<BookingStatus, string>> = {
      CONFIRMED: 'badge-green',
      CANCELLED: 'badge-red',
      FAILED: 'badge-red',
      CANCELLATION_REQUESTED: 'badge-orange',
      SUPPLIER_UNKNOWN: 'badge-orange',
    };
    return classes[status] ?? 'badge-blue';
  }

  formatPrice(amount: number, currency: string): string {
    const symbol = currency === 'INR' ? '₹' : `${currency} `;
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  }
}
