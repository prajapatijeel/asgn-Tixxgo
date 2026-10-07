/**
 * FlightApiService
 *
 * The ONLY place in the Angular app that talks to the NestJS backend.
 * Components never call HttpClient directly.
 *
 * Why a dedicated service?
 * - Single Responsibility: one class owns all HTTP communication for flights.
 * - Testability: easy to mock in tests.
 * - Reusability: any component can inject this service.
 * - Separation of concerns: components handle UI, services handle I/O.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FlightSearchRequest,
  FlightSearchResponse,
  RevalidationRequest,
  RevalidationApiResponse,
} from '../models/flight.models';

@Injectable({ providedIn: 'root' })
export class FlightApiService {
  private readonly baseUrl = environment.apiUrl;

  // HttpClient is injected by Angular's DI system — we never `new` it.
  constructor(private readonly http: HttpClient) {}

  /**
   * POST /api/flights/search
   * Returns an Observable of FlightSearchResponse.
   * The component subscribes and receives typed data — no `any`.
   */
  searchFlights(request: FlightSearchRequest): Observable<FlightSearchResponse> {
    return this.http.post<FlightSearchResponse>(
      `${this.baseUrl}/api/flights/search`,
      request,
    );
  }

  /**
   * POST /api/flights/revalidate
   * Must be called before proceeding to booking.
   * The backend re-checks the price with the supplier and returns
   * PRICE_CONFIRMED | PRICE_CHANGED | FLIGHT_UNAVAILABLE.
   */
  revalidateFlight(request: RevalidationRequest): Observable<RevalidationApiResponse> {
    return this.http.post<RevalidationApiResponse>(
      `${this.baseUrl}/api/flights/revalidate`,
      request,
    );
  }
}
