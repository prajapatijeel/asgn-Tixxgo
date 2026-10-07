import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SupplierGateway } from '../supplier/supplier-gateway.service';
import { PricingService } from './pricing/pricing.service';
import {
  FlightOffer,
  FlightOfferResponse,
  CabinClass,
  FlightSegment,
} from './models/flight-offer.model';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { RevalidateFlightDto } from './dto/revalidate-flight.dto';
import { SupplierFlightResult } from '../supplier/models/supplier-flight.model';

/**
 * Revalidation result returned to the controller.
 */
export interface RevalidationResult {
  offerId: string;
  priceStatus: 'PRICE_CONFIRMED' | 'PRICE_CHANGED' | 'FLIGHT_UNAVAILABLE';
  originalFinalPrice?: number;
  newFinalPrice?: number;
  priceDifference?: number;
  pricing?: ReturnType<PricingService['recalculatePricingAfterRevalidation']>;
  message: string;
}

/**
 * FlightService — business logic for flight search and revalidation.
 *
 * Responsibilities:
 * - Coordinate with SupplierGateway to get flight data
 * - Transform supplier results into Tixxgo FlightOffer models
 * - Apply pricing
 * - Manage the in-memory offer cache (for assessment; would use Redis/DB in production)
 * - Handle revalidation and price comparison
 *
 * What FlightService does NOT do:
 * - Talk to suppliers directly (SupplierGateway handles that)
 * - Handle HTTP (Controller handles that)
 * - Apply supplier-specific transformations (adapters handle that)
 * - Store bookings (BookingService handles that)
 *
 * Note on offer caching:
 * We store FlightOffer (including supplierResultKey) in memory keyed by offerId.
 * The frontend only knows the offerId. When the frontend sends offerId for
 * revalidation/booking, we look up the supplierResultKey internally.
 * This prevents the frontend from ever seeing supplier-specific data.
 *
 * Production note: Use a persistent cache (Redis/DB) with TTL for offer storage.
 */
@Injectable()
export class FlightsService {
  private readonly logger = new Logger(FlightsService.name);

  /**
   * In-memory offer cache: offerId → full FlightOffer (including supplierResultKey)
   * TTL: 30 minutes (conceptually; not enforced in this assessment)
   *
   * Production: Use Redis with TTL or a flight_offers table.
   */
  private readonly offerCache = new Map<string, FlightOffer>();

  constructor(
    private readonly supplierGateway: SupplierGateway,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * Search for flights.
   *
   * Flow:
   * 1. Validate params (done by DTO before we reach here)
   * 2. Ask SupplierGateway for supplier results
   * 3. Apply Tixxgo pricing to each result
   * 4. Create FlightOffer objects with opaque offerIds
   * 5. Cache the offers (with supplierResultKey) server-side
   * 6. Return sanitised FlightOfferResponse (no supplier keys) to controller
   */
  async searchFlights(params: SearchFlightsDto): Promise<FlightOfferResponse[]> {
    this.logger.log(
      `Flight search started: ${params.origin} → ${params.destination} on ${params.departureDate}`,
    );

    // Business rule: cannot search for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const searchDate = new Date(params.departureDate);
    if (searchDate < today) {
      throw new BadRequestException('Departure date cannot be in the past');
    }

    // Get raw supplier results
    const supplierResults = await this.supplierGateway.searchFlights(params);
    this.logger.log(`Supplier search completed: ${supplierResults.length} results`);

    // Transform each supplier result into a Tixxgo FlightOffer
    const offers: FlightOffer[] = supplierResults.map((result) =>
      this.buildFlightOffer(result),
    );

    // Cache all offers
    offers.forEach((offer) => this.offerCache.set(offer.offerId, offer));

    // Return sanitised response (strip supplierResultKey and supplier)
    return offers.map(({ supplierResultKey: _k, supplier: _s, ...rest }) => rest);
  }

  /**
   * Revalidate a flight offer.
   *
   * Flow:
   * 1. Look up offerId in cache
   * 2. Ask supplier to revalidate using supplierResultKey
   * 3. Recalculate pricing with new supplier prices
   * 4. Compare to cached price
   * 5. Return PRICE_CONFIRMED or PRICE_CHANGED
   *
   * Why revalidate?
   * Airline prices change in real-time. The price shown at search may
   * already be stale by the time the customer clicks "Book".
   * We ALWAYS revalidate before allowing payment.
   */
  async revalidateFlight(dto: RevalidateFlightDto): Promise<RevalidationResult> {
    this.logger.log(`Fare revalidation started for offer: ${dto.offerId}`);

    const cachedOffer = this.offerCache.get(dto.offerId);
    if (!cachedOffer) {
      throw new NotFoundException(
        `Flight offer not found or expired. Please search again.`,
      );
    }

    const supplierResult = await this.supplierGateway.revalidateFlight(
      cachedOffer.supplier,
      cachedOffer.supplierResultKey,
    );

    if (!supplierResult.isAvailable) {
      this.logger.warn(`Offer ${dto.offerId} is no longer available`);
      return {
        offerId: dto.offerId,
        priceStatus: 'FLIGHT_UNAVAILABLE',
        message: 'This flight is no longer available. Please search again.',
      };
    }

    // Recalculate with fresh supplier prices
    const newPricing = this.pricingService.recalculatePricingAfterRevalidation(
      supplierResult.baseFare,
      supplierResult.taxes,
      supplierResult.currency,
    );

    const originalFinalPrice = cachedOffer.pricing.finalPrice;
    const newFinalPrice = newPricing.finalPrice;
    const priceChanged = newFinalPrice !== originalFinalPrice;

    if (priceChanged) {
      this.logger.warn(
        `Price changed for offer ${dto.offerId}: ${originalFinalPrice} → ${newFinalPrice}`,
      );

      // Update cached offer with new pricing (requires explicit customer price acceptance)
      const updatedOffer: FlightOffer = {
        ...cachedOffer,
        pricing: newPricing,
        isRevalidated: true,
        revalidatedAt: new Date(),
        requiresPriceAcceptance: true,
        previousFinalPrice: originalFinalPrice,
      };
      this.offerCache.set(dto.offerId, updatedOffer);

      return {
        offerId: dto.offerId,
        priceStatus: 'PRICE_CHANGED',
        originalFinalPrice,
        newFinalPrice,
        priceDifference: newFinalPrice - originalFinalPrice,
        pricing: newPricing,
        message: `The price has changed from ₹${originalFinalPrice} to ₹${newFinalPrice}. Please confirm the new price to continue.`,
      };
    }

    this.logger.log(`Price confirmed for offer ${dto.offerId}: ₹${newFinalPrice}`);

    // Update cached offer as confirmed revalidated
    const confirmedOffer: FlightOffer = {
      ...cachedOffer,
      isRevalidated: true,
      revalidatedAt: new Date(),
      requiresPriceAcceptance: false,
    };
    this.offerCache.set(dto.offerId, confirmedOffer);

    return {
      offerId: dto.offerId,
      priceStatus: 'PRICE_CONFIRMED',
      originalFinalPrice,
      newFinalPrice,
      pricing: newPricing,
      message: 'Price confirmed. You may proceed to booking.',
    };
  }

  /**
   * Retrieve a cached offer by offerId.
   * Used by BookingService when creating a booking.
   */
  getOffer(offerId: string): FlightOffer | undefined {
    return this.offerCache.get(offerId);
  }

  /**
   * Build a complete FlightOffer from a supplier result + Tixxgo pricing.
   */
  private buildFlightOffer(result: SupplierFlightResult): FlightOffer {
    const offerId = uuidv4();
    const pricing = this.pricingService.calculatePricing(result);

    const segment: FlightSegment = {
      airline: result.airline,
      airlineCode: result.airlineCode,
      flightNumber: result.flightNumber,
      origin: result.origin,
      destination: result.destination,
      departureTime: result.departureTime,
      arrivalTime: result.arrivalTime,
      duration: result.duration,
      cabinClass: result.cabinClass as CabinClass,
    };

    return {
      offerId,
      supplier: result.supplier,
      supplierResultKey: result.supplierResultKey,
      segments: [segment],
      pricing,
      baggage: {
        checkIn: result.baggageCheckIn,
        cabin: result.baggageCabin,
      },
      isRefundable: result.isRefundable,
      seatsAvailable: result.seatsAvailable,
      isRevalidated: false,
      requiresPriceAcceptance: false,
    };
  }
}
