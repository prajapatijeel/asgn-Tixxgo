import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { BookingStateService } from '../../../../core/services/booking-state.service';
import { Booking } from '../../../../core/models/booking.models';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, HeaderComponent],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.css',
})
export class ConfirmationComponent implements OnInit {
  booking: Booking | null = null;

  constructor(
    private readonly bookingState: BookingStateService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.booking = this.bookingState.getBooking();

    // If no booking in state (e.g. user directly opened /booking/confirmation), redirect to search
    if (!this.booking) {
      this.router.navigate(['/flights/search']);
    }
  }

  formatPrice(amount: number, currency: string): string {
    const symbol = currency === 'INR' ? '₹' : currency;
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  }

  printItinerary(): void {
    window.print();
  }

  bookAnotherFlight(): void {
    this.bookingState.clearBooking();
    this.router.navigate(['/flights/search']);
  }

  viewBooking(): void {
    if (this.booking?.bookingRef) {
      this.router.navigate(['/booking', this.booking.bookingRef]);
    }
  }

  get isSupplierConfirmationPending(): boolean {
    return this.booking?.bookingStatus === 'SUPPLIER_UNKNOWN';
  }

  get heroTitle(): string {
    return this.isSupplierConfirmationPending
      ? 'Booking Status Pending'
      : 'Booking Confirmed!';
  }

  get heroSubtitle(): string {
    return this.isSupplierConfirmationPending
      ? 'Your payment was received. We are confirming your booking with the airline and will update the status shortly.'
      : 'Thank you for booking with Tixxgo. Your e-ticket reference is below.';
  }

  get bookingReferenceLabel(): string {
    return this.isSupplierConfirmationPending
      ? 'Tixxgo Booking Reference'
      : 'Booking Reference (Tixxgo PNR)';
  }
}
