/**
 * Tixxgo Internal Flight Offer model.
 *
 * This is the supplier-independent representation of a flight.
 * Angular ONLY ever sees this model — never TboFlightResult or anything
 * supplier-specific.
 *
 * Why:
 * If we switch from TBO to TripJack tomorrow, Angular doesn't change at all.
 * The adapter handles the transformation; the frontend gets the same shape.
 */

export enum CabinClass {
  ECONOMY = 'ECONOMY',
  PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
  BUSINESS = 'BUSINESS',
  FIRST = 'FIRST',
}

export interface FlightPricing {
  /** Price charged to supplier */
  supplierBaseFare: number;
  /** Taxes from supplier */
  supplierTaxes: number;
  /** Tixxgo platform service fee */
  serviceFee: number;
  /** Promotional discount (negative or zero) */
  discount: number;
  /** What the customer actually pays */
  finalPrice: number;
  currency: string;
}

export interface BaggageInfo {
  checkIn: string;   // e.g. "15 kg" or "1 piece 23 kg"
  cabin: string;     // e.g. "7 kg"
}

export interface FlightSegment {
  airline: string;         // e.g. "Air India"
  airlineCode: string;     // e.g. "AI"
  flightNumber: string;    // e.g. "AI-441"
  origin: string;          // IATA code e.g. "AMD"
  destination: string;     // IATA code e.g. "DEL"
  departureTime: string;   // ISO 8601
  arrivalTime: string;     // ISO 8601
  duration: string;        // e.g. "1h 45m"
  cabinClass: CabinClass;
}

export interface FlightOffer {
  /**
   * Tixxgo-assigned offer ID. Opaque to the supplier.
   * Used to look up the supplier's result when revalidating or booking.
   */
  offerId: string;

  /**
   * Which supplier this came from. Needed by the gateway to route
   * revalidation and booking to the correct adapter.
   */
  supplier: string;

  /**
   * Supplier's own result key. Stored server-side; never sent to Angular.
   * The frontend uses offerId. The backend maps offerId → supplierResultKey.
   */
  supplierResultKey: string;

  segments: FlightSegment[];
  pricing: FlightPricing;
  baggage: BaggageInfo;
  isRefundable: boolean;
  seatsAvailable: number;

  /** Server-side fare revalidation tracking */
  isRevalidated?: boolean;
  revalidatedAt?: Date;
  requiresPriceAcceptance?: boolean;
  previousFinalPrice?: number;
}

/**
 * A sanitised version of FlightOffer that is safe to send to Angular.
 * Note: supplierResultKey is NOT included here.
 */
export type FlightOfferResponse = Omit<FlightOffer, 'supplierResultKey' | 'supplier'>;
