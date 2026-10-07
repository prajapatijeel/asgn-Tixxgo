/**
 * flight.models.ts
 *
 * Strongly-typed contracts that mirror the Tixxgo backend REST API.
 * These interfaces represent what Angular sends to and receives from the
 * NestJS backend.  They do NOT expose any supplier-specific fields
 * (no supplierResultKey, no raw TBO data) — the backend hides all of that.
 *
 * Rule: Angular never calculates pricing. Every price field shown in the
 * UI comes directly from these interfaces, which are populated from the
 * backend response.
 */

// ── Cabin class ─────────────────────────────────────────────────────
export type CabinClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';

// ── Search ───────────────────────────────────────────────────────────

export interface FlightSearchRequest {
  origin: string;        // IATA code, e.g. "AMD"
  destination: string;   // IATA code, e.g. "DEL"
  departureDate: string; // ISO date string "YYYY-MM-DD"
  adults: number;
  cabinClass: CabinClass;
}

// ── Segment (one leg of a flight) ────────────────────────────────────

export interface FlightSegment {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string; // ISO datetime from backend
  arrivalTime: string;   // ISO datetime from backend
  duration: string;      // human-readable, e.g. "1h 45m"
  cabinClass: CabinClass;
}

// ── Pricing ──────────────────────────────────────────────────────────

export interface FlightPricing {
  supplierBaseFare: number;
  supplierTaxes: number;
  serviceFee: number;
  discount: number;       // may be negative (a reduction)
  finalPrice: number;     // THE price shown to user — backend is source of truth
  currency: string;       // e.g. "INR"
}

// ── Baggage ──────────────────────────────────────────────────────────

export interface BaggageInfo {
  checkIn: string; // e.g. "15 kg"
  cabin: string;   // e.g. "7 kg"
}

// ── Flight Offer (one result card) ───────────────────────────────────

export interface FlightOffer {
  offerId: string;
  segments: FlightSegment[];
  pricing: FlightPricing;
  baggage: BaggageInfo;
  isRefundable: boolean;
  seatsAvailable: number;
  // Revalidation state — set/updated by the backend, read-only in Angular
  isRevalidated: boolean;
  requiresPriceAcceptance: boolean;
}

// ── Search API response wrapper ──────────────────────────────────────

export interface FlightSearchResponse {
  success: boolean;
  data: FlightOffer[];
}

// ── Revalidation ──────────────────────────────────────────────────────

export interface RevalidationRequest {
  offerId: string;
}

export type PriceStatus = 'PRICE_CONFIRMED' | 'PRICE_CHANGED' | 'FLIGHT_UNAVAILABLE';

export interface RevalidationResponse {
  offerId: string;
  priceStatus: PriceStatus;
  // Present when priceStatus === 'PRICE_CHANGED'
  originalFinalPrice?: number;
  newFinalPrice?: number;
  priceDifference?: number;
  pricing?: FlightPricing;
  message?: string;
}

export interface RevalidationApiResponse {
  success: boolean;
  data: RevalidationResponse;
}

// ── Revalidation UI state (held in FlightStateService) ───────────────

export interface RevalidationState {
  status: PriceStatus;
  response: RevalidationResponse;
  priceAccepted: boolean; // true only if user explicitly clicked "Accept New Price"
}
