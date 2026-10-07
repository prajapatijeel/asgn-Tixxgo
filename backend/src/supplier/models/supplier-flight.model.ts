/**
 * Supplier-specific flight data.
 *
 * This type NEVER leaves the supplier layer.
 * It represents the raw data from a supplier (TBO, TripJack, etc.)
 * before transformation into Tixxgo's internal FlightOffer model.
 *
 * Why a separate type?
 * If TBO changes its response format, we only update TboAdapter.
 * The rest of the codebase is untouched.
 */
export interface SupplierFlightResult {
  /** Supplier's own unique result key (TBO: ResultIndex, TripJack: searchId etc.) */
  supplierResultKey: string;
  supplier: string;

  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;  // ISO 8601
  arrivalTime: string;    // ISO 8601
  duration: string;

  /** What supplier charges us */
  baseFare: number;
  taxes: number;
  currency: string;

  cabinClass: string;
  baggageCheckIn: string;
  baggageCabin: string;
  isRefundable: boolean;
  seatsAvailable: number;
}

/**
 * What the supplier returns for revalidation.
 */
export interface SupplierRevalidationResult {
  supplierResultKey: string;
  isAvailable: boolean;
  baseFare: number;
  taxes: number;
  currency: string;
}

/**
 * What the supplier needs to create a booking.
 */
export interface SupplierBookingRequest {
  supplierResultKey: string;
  travellers: SupplierTraveller[];
}

export interface SupplierTraveller {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber?: string;
  passportExpiry?: string;
  nationality?: string;
}

/**
 * What the supplier returns after a successful booking.
 */
export interface SupplierBookingResult {
  supplierBookingId: string;
  supplierPNR: string;
  status: string;
  ticketNumbers?: string[];
}

/**
 * What the supplier returns when we check booking status.
 */
export interface SupplierBookingStatus {
  supplierBookingId: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'FAILED' | 'PENDING';
  pnr?: string;
}

/**
 * What the supplier returns for a cancellation.
 */
export interface SupplierCancellationResult {
  cancellationId: string;
  cancellationCharge: number;
  refundAmount: number;
  currency: string;
}
