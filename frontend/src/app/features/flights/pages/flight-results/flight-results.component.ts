/**
 * FlightResultsComponent — /flights/results
 *
 * Responsibilities:
 * 1. Read flight offers from FlightStateService (populated by search page)
 * 2. Display each offer as a card
 * 3. On "Select Flight": call FlightApiService.revalidateFlight()
 * 4. Handle all three revalidation outcomes:
 *    - PRICE_CONFIRMED → show confirmation panel
 *    - PRICE_CHANGED   → show price-change panel, require explicit acceptance
 *    - FLIGHT_UNAVAILABLE → show unavailable message
 * 5. Show loading/error states throughout
 *
 * What this component does NOT do:
 * - Does not calculate any price (all prices come from the backend)
 * - Does not call HttpClient (delegates to FlightApiService)
 * - Does not auto-accept price changes (user must click "Accept New Price")
 */
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FlightApiService } from '../../../../core/services/flight-api.service';
import { FlightStateService } from '../../../../core/services/flight-state.service';
import { FlightOffer, RevalidationState, RevalidationApiResponse } from '../../../../core/models/flight.models';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-flight-results',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe, HeaderComponent],
  templateUrl: './flight-results.component.html',
  styleUrl: './flight-results.component.css',
})
export class FlightResultsComponent implements OnInit {
  offers: FlightOffer[] = [];

  // Which offer is currently being revalidated
  revalidatingOfferId: string | null = null;
  revalidationError: string | null = null;

  // The revalidation result for the selected offer
  revalidationState: RevalidationState | null = null;
  selectedOffer: FlightOffer | null = null;

  constructor(
    private readonly flightApi: FlightApiService,
    private readonly flightState: FlightStateService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    // Read offers stored by the search page
    this.offers = this.flightState.getOffers();

    // If the user navigated here directly (e.g. browser refresh), redirect to search
    if (this.offers.length === 0) {
      this.router.navigate(['/flights/search']);
    }
  }

  /** Format a price as INR (₹1,234) for display. Backend is the source of truth. */
  formatPrice(amount: number, currency: string): string {
    const symbol = currency === 'INR' ? '₹' : currency;
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  }

  /** Called when user clicks "Select Flight" on a flight card */
  selectFlight(offer: FlightOffer): void {
    // Clear any previous revalidation result
    this.revalidationState = null;
    this.revalidationError = null;
    this.selectedOffer = offer;
    this.revalidatingOfferId = offer.offerId;

    this.flightState.setSelectedOffer(offer);

    this.flightApi.revalidateFlight({ offerId: offer.offerId }).subscribe({
      next: (response: RevalidationApiResponse) => {
        this.revalidatingOfferId = null;
        if (response.success && response.data) {
          const state: RevalidationState = {
            status: response.data.priceStatus,
            response: response.data,
            priceAccepted: false,
          };
          this.revalidationState = state;
          this.flightState.setRevalidationState(state);
          // Scroll to the revalidation panel smoothly
          setTimeout(() => {
            document.getElementById('revalidation-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 50);
        } else {
          this.revalidationError = 'Unable to verify fare. Please try again.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.revalidatingOfferId = null;
        if (err.status === 0) {
          this.revalidationError = 'Connection error. Please check your network and try again.';
        } else if (err.status === 404) {
          this.revalidationError = 'This flight offer has expired. Please search again.';
        } else {
          this.revalidationError = 'Fare check failed. Please try again or select a different flight.';
        }
      },
    });
  }

  /** Called when user explicitly accepts a changed price */
  acceptPriceChange(): void {
    this.flightState.acceptPriceChange();
    // Reflect the accepted state locally for the UI
    if (this.revalidationState) {
      this.revalidationState = { ...this.revalidationState, priceAccepted: true };
    }
  }

  /** Dismiss revalidation panel and let user pick again */
  dismissRevalidation(): void {
    this.revalidationState = null;
    this.revalidationError = null;
    this.selectedOffer = null;
    this.revalidatingOfferId = null;
  }

  proceedToBooking(): void {
    if (this.selectedOffer) {
      this.router.navigate(['/booking/traveller']);
    }
  }

  goBackToSearch(): void {
    this.router.navigate(['/flights/search']);
  }
}
