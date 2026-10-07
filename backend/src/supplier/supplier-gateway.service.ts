import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupplierAdapter } from './interfaces/supplier-adapter.interface';
import { TboAdapter } from './adapters/tbo/tbo.adapter';
import {
  SupplierFlightResult,
  SupplierRevalidationResult,
  SupplierBookingRequest,
  SupplierBookingResult,
  SupplierBookingStatus,
  SupplierCancellationResult,
} from './models/supplier-flight.model';
import { SearchFlightsDto } from '../flights/dto/search-flights.dto';

/**
 * SupplierGateway — the single entry point for ALL supplier operations.
 *
 * Why a Gateway?
 * The FlightService and BookingService should not know about TBO directly.
 * They ask the Gateway: "search for flights", "book this flight", etc.
 * The Gateway decides which adapter to use based on the supplier name.
 *
 * Adding a new supplier in the future:
 * 1. Create TripJackAdapter implementing SupplierAdapter
 * 2. Register it here in the constructor
 * 3. Done — FlightService doesn't change
 *
 * Current behaviour:
 * All requests go to TBO (it's the only registered adapter).
 * The `defaultSupplier` is 'TBO'.
 */
@Injectable()
export class SupplierGateway {
  private readonly logger = new Logger(SupplierGateway.name);
  private readonly adapters = new Map<string, SupplierAdapter>();
  private readonly defaultSupplier = 'TBO';

  constructor(private readonly tboAdapter: TboAdapter) {
    // Register all adapters at startup
    this.adapters.set(tboAdapter.supplierName, tboAdapter);
    this.logger.log(`Registered suppliers: ${[...this.adapters.keys()].join(', ')}`);
  }

  async searchFlights(params: SearchFlightsDto): Promise<SupplierFlightResult[]> {
    // Currently search all registered suppliers and merge results.
    // Future: could add supplier priority, parallel search, etc.
    const results: SupplierFlightResult[] = [];

    for (const adapter of this.adapters.values()) {
      try {
        const supplierResults = await adapter.searchFlights(params);
        results.push(...supplierResults);
      } catch (error) {
        // Don't fail the entire search if one supplier fails
        this.logger.error(`Supplier ${adapter.supplierName} search failed`, error);
      }
    }

    return results;
  }

  async revalidateFlight(
    supplier: string,
    supplierResultKey: string,
  ): Promise<SupplierRevalidationResult> {
    const adapter = this.getAdapter(supplier);
    return adapter.revalidateFlight(supplierResultKey);
  }

  async bookFlight(
    supplier: string,
    request: SupplierBookingRequest,
  ): Promise<SupplierBookingResult> {
    const adapter = this.getAdapter(supplier);
    return adapter.bookFlight(request);
  }

  async getBookingStatus(
    supplier: string,
    supplierBookingId: string,
  ): Promise<SupplierBookingStatus> {
    const adapter = this.getAdapter(supplier);
    return adapter.getBookingStatus(supplierBookingId);
  }

  async cancelBooking(
    supplier: string,
    supplierBookingId: string,
  ): Promise<SupplierCancellationResult> {
    const adapter = this.getAdapter(supplier);
    return adapter.cancelBooking(supplierBookingId);
  }

  getDefaultSupplier(): string {
    return this.defaultSupplier;
  }

  private getAdapter(supplier: string): SupplierAdapter {
    const adapter = this.adapters.get(supplier);
    if (!adapter) {
      throw new NotFoundException(`No adapter registered for supplier: ${supplier}`);
    }
    return adapter;
  }
}
