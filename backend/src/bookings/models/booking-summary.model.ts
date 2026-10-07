import { BookingStatus, PaymentStatus } from '../entities/booking.entity';

/**
 * Customer-facing summary used by the booking-list endpoint.
 *
 * This deliberately excludes traveller details, payment records,
 * supplier result keys, and other internal fields. When authentication is
 * added, the list query can be scoped by the authenticated customer here
 * without changing this public response shape.
 */
export interface BookingSummary {
  id: string;
  bookingRef: string;
  supplier: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  finalPrice: number;
  currency: string;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  createdAt: Date;
}
