import {
  SupplierFlightResult,
  SupplierRevalidationResult,
  SupplierBookingRequest,
  SupplierBookingResult,
  SupplierBookingStatus,
  SupplierCancellationResult,
} from '../models/supplier-flight.model';
import { SearchFlightsDto } from '../../flights/dto/search-flights.dto';

/**
 * SupplierAdapter contract.
 *
 * Every supplier (TBO, TripJack, Amadeus, etc.) MUST implement this interface.
 *
 * Why an interface?
 * - The Flight Service depends on THIS interface, not on TboAdapter directly.
 * - Adding a new supplier = implementing this interface + registering with the gateway.
 * - The rest of the codebase is untouched.
 *
 * This is the Adapter Pattern (Gang of Four):
 * The adapter translates between the supplier's specific API and our
 * application's internal contract.
 *
 * Interview question you'll get:
 * "How would you add a second supplier?"
 * Answer: "Create a class implementing SupplierAdapter, register it in
 * SupplierGateway. The FlightService doesn't change at all."
 */
export interface SupplierAdapter {
  /**
   * Returns supplier name. Used by the gateway to route requests.
   */
  readonly supplierName: string;

  /**
   * Search for available flights.
   */
  searchFlights(params: SearchFlightsDto): Promise<SupplierFlightResult[]>;

  /**
   * Revalidate a specific flight offer to check current price/availability.
   * Always called before creating a booking.
   */
  revalidateFlight(supplierResultKey: string): Promise<SupplierRevalidationResult>;

  /**
   * Create a booking with the supplier.
   *
   * IMPORTANT: This is NOT idempotent by default. The calling code must
   * handle the case where this times out (the booking may have been created
   * even if we didn't get a response).
   */
  bookFlight(request: SupplierBookingRequest): Promise<SupplierBookingResult>;

  /**
   * Check the status of an existing booking.
   * Used after a timeout to determine if the booking was actually created.
   */
  getBookingStatus(supplierBookingId: string): Promise<SupplierBookingStatus>;

  /**
   * Cancel an existing booking.
   */
  cancelBooking(supplierBookingId: string): Promise<SupplierCancellationResult>;
}
