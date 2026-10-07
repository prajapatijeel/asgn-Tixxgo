import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlightOffer } from '../models/flight-offer.model';
import { SupplierFlightResult } from '../../supplier/models/supplier-flight.model';

export interface PricingBreakdown {
  supplierBaseFare: number;
  supplierTaxes: number;
  serviceFee: number;
  discount: number;
  finalPrice: number;
  currency: string;
}

/**
 * PricingService — calculates Tixxgo customer pricing.
 *
 * Why a separate service?
 * Pricing rules are a business concern, not a supplier concern.
 * The supplier gives us raw fares. We add our service fee and apply
 * promotions. This logic might change frequently (promotions, dynamic fees).
 * Keeping it isolated makes it easy to update and test independently.
 *
 * Important separation:
 * supplierBaseFare + supplierTaxes = What Tixxgo pays the supplier
 * + serviceFee = Tixxgo's revenue
 * - discount = Promotion applied for the customer
 * = finalPrice = What the customer pays
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly serviceFee: number;
  private readonly defaultDiscount: number;

  constructor(private readonly configService: ConfigService) {
    this.serviceFee = this.configService.get<number>('pricing.serviceFee') ?? 299;
    this.defaultDiscount = this.configService.get<number>('pricing.defaultDiscount') ?? 200;
  }

  /**
   * Calculate pricing for a supplier flight result.
   *
   * Example:
   * Base Fare    = 5200
   * Taxes        =  950
   * Service Fee  =  299
   * Discount     = -200
   * Final Price  = 6249
   */
  calculatePricing(supplierResult: SupplierFlightResult): PricingBreakdown {
    const { baseFare, taxes, currency } = supplierResult;

    const breakdown: PricingBreakdown = {
      supplierBaseFare: baseFare,
      supplierTaxes: taxes,
      serviceFee: this.serviceFee,
      discount: -this.defaultDiscount,
      finalPrice: 0,
      currency,
    };

    breakdown.finalPrice =
      breakdown.supplierBaseFare +
      breakdown.supplierTaxes +
      breakdown.serviceFee +
      breakdown.discount;

    this.logger.debug(
      `Pricing: ${baseFare} base + ${taxes} tax + ${this.serviceFee} fee - ${this.defaultDiscount} discount = ${breakdown.finalPrice} ${currency}`,
    );

    return breakdown;
  }

  /**
   * Recalculate pricing after revalidation (price may have changed).
   * Same logic, just called with fresh supplier prices.
   */
  recalculatePricingAfterRevalidation(
    newBaseFare: number,
    newTaxes: number,
    currency: string,
  ): PricingBreakdown {
    const breakdown: PricingBreakdown = {
      supplierBaseFare: newBaseFare,
      supplierTaxes: newTaxes,
      serviceFee: this.serviceFee,
      discount: -this.defaultDiscount,
      finalPrice: 0,
      currency,
    };

    breakdown.finalPrice =
      breakdown.supplierBaseFare +
      breakdown.supplierTaxes +
      breakdown.serviceFee +
      breakdown.discount;

    return breakdown;
  }
}
