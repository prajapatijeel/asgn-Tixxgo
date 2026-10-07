import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FlightStateService } from '../../../../core/services/flight-state.service';
import { BookingApiService } from '../../../../core/services/booking-api.service';
import { BookingStateService } from '../../../../core/services/booking-state.service';
import { FlightOffer, RevalidationState } from '../../../../core/models/flight.models';
import { CreateBookingRequest, BookingApiResponse, PaymentMethod } from '../../../../core/models/booking.models';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-traveller',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe, HeaderComponent],
  templateUrl: './traveller.component.html',
  styleUrl: './traveller.component.css',
})
export class TravellerComponent implements OnInit {
  selectedOffer: FlightOffer | null = null;
  revalidationState: RevalidationState | null = null;

  bookingForm!: FormGroup;
  isSubmitting = false;
  errorMessage: string | null = null;

  // Idempotency key generated ONCE for this booking session attempt
  // Reused if submission fails and user retries
  idempotencyKey = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly flightState: FlightStateService,
    private readonly bookingApi: BookingApiService,
    private readonly bookingState: BookingStateService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.selectedOffer = this.flightState.getSelectedOffer();
    this.revalidationState = this.flightState.getRevalidationState();

    // If no offer selected, redirect user to search
    if (!this.selectedOffer) {
      this.router.navigate(['/flights/search']);
      return;
    }

    // Generate unique Idempotency Key once per session attempt
    this.idempotencyKey = crypto.randomUUID();

    // Initialize reactive form with default values for quick testing
    this.bookingForm = this.fb.group({
      firstName: ['Jeel', [Validators.required, Validators.minLength(2)]],
      lastName: ['Prajapati', [Validators.required, Validators.minLength(2)]],
      dateOfBirth: ['1995-08-20', [Validators.required]],
      passportNumber: ['A1234567', [Validators.maxLength(20)]],
      passportExpiry: ['2030-12-31'],
      nationality: ['IN', [Validators.required, Validators.maxLength(2)]],
      email: ['jeel@example.com', [Validators.required, Validators.email]],
      phone: ['+919876543210', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      paymentMethod: ['MOCK' as PaymentMethod, [Validators.required]],
    });
  }

  get f() {
    return this.bookingForm.controls;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.bookingForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  formatPrice(amount: number, currency: string): string {
    const symbol = currency === 'INR' ? '₹' : currency;
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  }

  submitBooking(): void {
    this.bookingForm.markAllAsTouched();

    if (this.bookingForm.invalid || !this.selectedOffer) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const formValue = this.bookingForm.value;

    const request: CreateBookingRequest = {
      offerId: this.selectedOffer.offerId,
      idempotencyKey: this.idempotencyKey,
      travellers: [
        {
          firstName: formValue.firstName.trim(),
          lastName: formValue.lastName.trim(),
          dateOfBirth: formValue.dateOfBirth,
          passportNumber: formValue.passportNumber ? formValue.passportNumber.trim() : undefined,
          passportExpiry: formValue.passportExpiry ? formValue.passportExpiry : undefined,
          nationality: formValue.nationality ? formValue.nationality.trim().toUpperCase() : 'IN',
        },
      ],
      contactInfo: {
        email: formValue.email.trim(),
        phone: formValue.phone.trim(),
      },
      paymentMethod: formValue.paymentMethod,
      acceptedPriceChange: this.revalidationState?.priceAccepted ?? false,
    };

    this.bookingApi.createBooking(request).subscribe({
      next: (response: BookingApiResponse) => {
        this.isSubmitting = false;
        if (response.success && response.data) {
          this.bookingState.setBooking(response.data);
          this.router.navigate(['/booking/confirmation']);
        } else {
          this.errorMessage = response.message || 'Booking creation failed. Please try again.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        if (err.status === 400 && err.error?.message) {
          this.errorMessage = `Booking Error: ${err.error.message}`;
        } else if (err.status === 0) {
          this.errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          this.errorMessage = 'Failed to process booking. Please check your details and try again.';
        }
      },
    });
  }

  goBackToResults(): void {
    this.router.navigate(['/flights/results']);
  }
}
