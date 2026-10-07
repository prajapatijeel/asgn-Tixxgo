import { Module } from '@nestjs/common';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { PricingService } from './pricing/pricing.service';
import { SupplierModule } from '../supplier/supplier.module';

/**
 * FlightsModule — owns all flight search and revalidation logic.
 *
 * Imports SupplierModule to use SupplierGateway.
 * Does NOT import BookingsModule (no circular dependency).
 */
@Module({
  imports: [SupplierModule],
  controllers: [FlightsController],
  providers: [FlightsService, PricingService],
  exports: [FlightsService], // BookingsModule needs FlightsService to look up offers
})
export class FlightsModule {}
