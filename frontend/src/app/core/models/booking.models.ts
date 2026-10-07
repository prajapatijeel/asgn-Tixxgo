/**
 * booking.models.ts
 *
 * Strongly-typed contracts for the Tixxgo booking API.
 * Kept separate from flight.models.ts because booking is a distinct
 * backend domain — different controller, different service, different DB tables.
 *
 * Architectural rule: Angular never decides booking status, payment status,
 * or PNR. It only displays what the backend returns in these interfaces.
 */

// ── Payment method ────────────────────────────────────────────────────
// The assessment uses MOCK. Real options would be CARD, UPI, NET_BANKING.
export type PaymentMethod = 'MOCK' | 'CARD' | 'UPI' | 'NET_BANKING';

// ── Traveller (one passenger) ─────────────────────────────────────────
export interface Traveller {
  firstName: string;
  lastName: string;
  dateOfBirth: string;     // "YYYY-MM-DD"
  passportNumber?: string; // optional
  passportExpiry?: string; // optional, "YYYY-MM-DD"
  nationality?: string;    // optional, ISO 3166-1 alpha-2, e.g. "IN"
}

// ── Contact info ──────────────────────────────────────────────────────
export interface ContactInfo {
  email: string;
  phone: string;
}

// ── Request sent to POST /api/bookings ────────────────────────────────
export interface CreateBookingRequest {
  offerId: string;
  idempotencyKey: string;  // UUID — generated once per booking attempt
  travellers: Traveller[];
  contactInfo: ContactInfo;
  paymentMethod: PaymentMethod;
  /**
   * Must be true when the revalidation returned PRICE_CHANGED and the
   * user explicitly accepted it. The backend enforces this server-side too.
   * Angular must NOT set this to true automatically.
   */
  acceptedPriceChange: boolean;
}

// ── Backend payment statuses ──────────────────────────────────────────
// Mirror the backend enum — never collapsed into just "success/failure".
export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

// ── Backend booking statuses ──────────────────────────────────────────
export type BookingStatus =
  | 'PENDING'
  | 'PAYMENT_RECEIVED'
  | 'SUPPLIER_BOOKING'
  | 'SUPPLIER_UNKNOWN'   // Timeout — payment OK but airline confirmation unknown
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLATION_REQUESTED'
  | 'CANCELLED';

// ── Supplier booking statuses ─────────────────────────────────────────
export type SupplierBookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'UNKNOWN'
  | 'CANCELLED';

// ── Traveller record returned by backend ──────────────────────────────
export interface TravellerRecord {
  id: string;
  bookingId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber: string | null;
  passportExpiry: string | null;
  nationality: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Payment record returned by backend ───────────────────────────────
export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  gatewayReference: string;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Supplier booking record returned by backend ───────────────────────
export interface SupplierBookingRecord {
  id: string;
  bookingId: string;
  status: SupplierBookingStatus;
  supplierBookingId: string | null;
  pnr: string | null;
  ticketNumbers: string | null; // JSON-encoded string from backend
  errorMessage: string | null;
  cancellationId: string | null;
  cancellationCharge: number | null;
  refundAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

// ── Full booking record as returned by GET or POST /api/bookings ──────
export interface Booking {
  id: string;
  bookingRef: string;      // e.g. "TXG-490197"
  offerId: string;
  supplier: string;
  // Pricing — all from backend, never recalculated in Angular
  supplierBaseFare: number;
  supplierTaxes: number;
  serviceFee: number;
  discount: number;
  finalPrice: number;
  currency: string;
  // Flight details
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  // Statuses — two separate concerns
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  travellers: TravellerRecord[];
  payment: PaymentRecord | null;
  supplierBooking: SupplierBookingRecord | null;
}

// ── API response wrapper ──────────────────────────────────────────────
export interface BookingApiResponse {
  success: boolean;
  data: Booking;
  message?: string;
}
