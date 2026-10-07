import { Injectable, Logger } from '@nestjs/common';
import { SupplierAdapter } from '../../interfaces/supplier-adapter.interface';
import {
  SupplierFlightResult,
  SupplierRevalidationResult,
  SupplierBookingRequest,
  SupplierBookingResult,
  SupplierBookingStatus,
  SupplierCancellationResult,
} from '../../models/supplier-flight.model';
import { SearchFlightsDto } from '../../../flights/dto/search-flights.dto';
import {
  generateMockTboResults,
  mockTboRevalidate,
  mockTboBook,
  mockTboGetStatus,
  mockTboCancel,
  mapTboCabinClass,
  formatDuration,
  TboFlightOption,
} from './tbo-mock-data';

/**
 * TBO Supplier Adapter.
 *
 * Responsibility: Communicate with TBO API (mocked here) and transform
 * TBO-specific responses into Tixxgo's internal SupplierFlightResult.
 *
 * What this class does NOT do:
 * - Apply Tixxgo pricing (that's PricingService's job)
 * - Store anything in the database (that's BookingService's job)
 * - Know about Angular or HTTP (that's the Controller's job)
 *
 * This is the Adapter Pattern: TboAdapter translates between TBO's
 * language and our application's internal language.
 *
 * To integrate real TBO:
 * Replace generateMockTboResults(), mockTboRevalidate() etc. with
 * actual axios HTTP calls to TBO's API. The transformation logic stays.
 */
@Injectable()
export class TboAdapter implements SupplierAdapter {
  readonly supplierName = 'TBO';
  private readonly logger = new Logger(TboAdapter.name);

  async searchFlights(params: SearchFlightsDto): Promise<SupplierFlightResult[]> {
    this.logger.log(`TBO: Searching flights ${params.origin} → ${params.destination}`);

    // In real implementation: HTTP call to TBO Search API
    const tboResults = generateMockTboResults(params);

    this.logger.log(`TBO: Received ${tboResults.length} results`);

    // Transform TBO format → Tixxgo internal format
    return tboResults.map((result) => this.transformFlightResult(result));
  }

  async revalidateFlight(supplierResultKey: string): Promise<SupplierRevalidationResult> {
    this.logger.log(`TBO: Revalidating result key: ${supplierResultKey}`);

    // In real implementation: HTTP call to TBO Revalidation API
    const tboResponse = mockTboRevalidate(supplierResultKey);

    return {
      supplierResultKey,
      isAvailable: tboResponse.IsValid,
      baseFare: tboResponse.Fare.BaseFare,
      taxes: tboResponse.Fare.Tax,
      currency: tboResponse.Fare.Currency,
    };
  }

  async bookFlight(request: SupplierBookingRequest): Promise<SupplierBookingResult> {
    this.logger.log(`TBO: Booking flight for result key: ${request.supplierResultKey}`);

    // In real implementation: HTTP call to TBO Booking API
    const tboResponse = mockTboBook(request.supplierResultKey, request.travellers);

    return {
      supplierBookingId: tboResponse.BookingId,
      supplierPNR: tboResponse.PNR,
      status: tboResponse.Status,
      ticketNumbers: tboResponse.TicketNumbers,
    };
  }

  async getBookingStatus(supplierBookingId: string): Promise<SupplierBookingStatus> {
    this.logger.log(`TBO: Checking status for booking: ${supplierBookingId}`);

    const tboResponse = mockTboGetStatus(supplierBookingId);

    const statusMap: Record<string, 'CONFIRMED' | 'CANCELLED' | 'FAILED' | 'PENDING'> = {
      Confirmed: 'CONFIRMED',
      Cancelled: 'CANCELLED',
      Failed: 'FAILED',
      Pending: 'PENDING',
    };

    return {
      supplierBookingId,
      status: statusMap[tboResponse.Status] ?? 'PENDING',
      pnr: tboResponse.PNR,
    };
  }

  async cancelBooking(supplierBookingId: string): Promise<SupplierCancellationResult> {
    this.logger.log(`TBO: Cancelling booking: ${supplierBookingId}`);

    const tboResponse = mockTboCancel(supplierBookingId);

    return {
      cancellationId: tboResponse.CancellationId,
      cancellationCharge: tboResponse.CancellationCharge,
      refundAmount: tboResponse.RefundAmount,
      currency: tboResponse.Currency,
    };
  }

  /**
   * Transform TBO's response into our internal model.
   * This is the core of the adapter pattern.
   *
   * TBO uses nested Segments arrays (supports multi-leg journeys).
   * We flatten the first segment for simplicity in this assessment.
   */
  private transformFlightResult(tboResult: TboFlightOption): SupplierFlightResult {
    // TBO wraps segments in arrays-of-arrays for multi-stop support
    const firstLeg = tboResult.Segments[0];
    const firstSegment = firstLeg[0];
    const lastSegment = firstLeg[firstLeg.length - 1];

    const totalDuration = firstLeg.reduce((sum, seg) => sum + seg.Duration, 0);

    return {
      supplierResultKey: tboResult.ResultIndex,
      supplier: this.supplierName,
      airline: firstSegment.Airline.AirlineName,
      airlineCode: firstSegment.Airline.AirlineCode,
      flightNumber: `${firstSegment.Airline.AirlineCode}-${firstSegment.Airline.FlightNumber}`,
      origin: firstSegment.Origin.Airport.AirportCode,
      destination: lastSegment.Destination.Airport.AirportCode,
      departureTime: firstSegment.Origin.DepTime,
      arrivalTime: lastSegment.Destination.ArrTime,
      duration: formatDuration(totalDuration),
      baseFare: tboResult.Fare.BaseFare,
      taxes: tboResult.Fare.Tax,
      currency: tboResult.Fare.Currency,
      cabinClass: mapTboCabinClass(firstSegment.CabinClass),
      baggageCheckIn: firstSegment.Baggage,
      baggageCabin: firstSegment.CabinBaggage,
      isRefundable: tboResult.FareClassification.Type === 'Refundable',
      seatsAvailable: firstSegment.AvailableSeats,
    };
  }
}
