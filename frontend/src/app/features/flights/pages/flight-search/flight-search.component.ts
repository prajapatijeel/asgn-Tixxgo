/**
 * FlightSearchComponent — /flights/search
 *
 * Responsibilities:
 * 1. Display the search form (Reactive Form)
 * 2. Validate inputs client-side before submitting
 * 3. Call FlightApiService.searchFlights() on submit
 * 4. Store results in FlightStateService
 * 5. Navigate to /flights/results on success
 * 6. Show loading state while request is in-flight
 * 7. Show user-friendly error if API call fails
 *
 * What this component does NOT do:
 * - It does not call HttpClient directly (that's FlightApiService's job)
 * - It does not calculate or modify any pricing
 * - It does not store raw HTTP responses
 */
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FlightApiService } from '../../../../core/services/flight-api.service';
import { FlightStateService } from '../../../../core/services/flight-state.service';
import { FlightSearchRequest, FlightSearchResponse, CabinClass } from '../../../../core/models/flight.models';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-flight-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './flight-search.component.html',
  styleUrl: './flight-search.component.css',
})
export class FlightSearchComponent implements OnInit {
  searchForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  readonly cabinClasses: { value: CabinClass; label: string }[] = [
    { value: 'ECONOMY',         label: 'Economy' },
    { value: 'PREMIUM_ECONOMY', label: 'Premium Economy' },
    { value: 'BUSINESS',        label: 'Business' },
    { value: 'FIRST',           label: 'First Class' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly flightApi: FlightApiService,
    private readonly flightState: FlightStateService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.searchForm = this.fb.group({
      origin:        ['AMD', [Validators.required, Validators.minLength(2), Validators.maxLength(5)]],
      destination:   ['DEL', [Validators.required, Validators.minLength(2), Validators.maxLength(5)]],
      departureDate: ['2026-10-15', [Validators.required]],
      adults:        [1, [Validators.required, Validators.min(1), Validators.max(9)]],
      cabinClass:    ['ECONOMY' as CabinClass, [Validators.required]],
    });
  }

  /** Shorthand helpers used in the template for validation messages */
  get f() {
    return this.searchForm.controls;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.searchForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    // Mark all fields touched so validation errors appear if user hits submit immediately
    this.searchForm.markAllAsTouched();

    if (this.searchForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Clear stale results from a previous search
    this.flightState.clearAll();

    const request: FlightSearchRequest = {
      origin:        this.searchForm.value.origin.toUpperCase().trim(),
      destination:   this.searchForm.value.destination.toUpperCase().trim(),
      departureDate: this.searchForm.value.departureDate,
      adults:        Number(this.searchForm.value.adults),
      cabinClass:    this.searchForm.value.cabinClass,
    };

    this.flightApi.searchFlights(request).subscribe({
      next: (response: FlightSearchResponse) => {
        this.isLoading = false;
        if (response.success && response.data) {
          // Store results in state service — results page will read from here
          this.flightState.setOffers(response.data);
          this.router.navigate(['/flights/results']);
        } else {
          this.errorMessage = 'No flights were returned. Please adjust your search criteria.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        // Never expose raw HTTP errors to the user
        if (err.status === 0) {
          this.errorMessage = 'Unable to connect to the server. Please check your connection and try again.';
        } else if (err.status >= 500) {
          this.errorMessage = 'A server error occurred. Please try again in a moment.';
        } else {
          this.errorMessage = 'Unable to search flights. Please check your inputs and try again.';
        }
      },
    });
  }
}
