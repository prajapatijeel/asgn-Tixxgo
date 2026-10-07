import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingEntity } from './entities/booking.entity';
import { TravellerEntity } from './entities/traveller.entity';
import { PaymentEntity } from './entities/payment.entity';
import { SupplierBookingEntity } from './entities/supplier-booking.entity';
import { FlightsModule } from '../flights/flights.module';
import { SupplierModule } from '../supplier/supplier.module';

/**
 * BookingsModule — owns the complete booking lifecycle.
 *
 * Imports:
 * - SequelizeModule.forFeature: Registers all booking-related models
 * - FlightsModule: To look up flight offers by offerId
 * - SupplierModule: To call supplier for booking, status, cancellation
 */
@Module({
  imports: [
    SequelizeModule.forFeature([
      BookingEntity,
      TravellerEntity,
      PaymentEntity,
      SupplierBookingEntity,
    ]),
    FlightsModule,
    SupplierModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
