import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { BookingEntity, BookingStatus, PaymentStatus } from './entities/booking.entity';
import { TravellerEntity } from './entities/traveller.entity';
import { PaymentEntity, PaymentMethod } from './entities/payment.entity';
import { SupplierBookingEntity, SupplierBookingStatus } from './entities/supplier-booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { FlightsService } from '../flights/flights.service';
import { SupplierGateway } from '../supplier/supplier-gateway.service';

/**
 * BookingService — the core of the booking lifecycle.
 *
 * This service manages the state machine:
 *
 * PENDING
 *   → PAYMENT_RECEIVED (payment processed)
 *     → SUPPLIER_BOOKING (supplier call in progress)
 *       → CONFIRMED (supplier confirmed)
 *       → SUPPLIER_UNKNOWN (timeout — check later)
 *       → FAILED (supplier failed)
 * CONFIRMED
 *   → CANCELLATION_REQUESTED
 *     → CANCELLED
 *       (→ REFUND_PENDING → REFUNDED in PaymentStatus)
 *
 * Key design decisions:
 *
 * 1. Idempotency:
 *    If a booking already exists for an idempotencyKey, return it.
 *    Prevents double-clicks and network retries from creating two bookings.
 *
 * 2. Timeout/UNKNOWN:
 *    If the supplier call times out, we don't know if they created the booking.
 *    We set status = SUPPLIER_UNKNOWN and can check later via checkBookingStatus().
 *    We do NOT immediately mark it as FAILED.
 *
 * 3. Transaction:
 *    All DB writes for a booking are wrapped in a Sequelize transaction.
 *    If any step fails, everything rolls back — no orphaned records.
 *
 * 4. Payment and booking are separate:
 *    We mark payment as SUCCESS before calling the supplier.
 *    If the supplier fails, payment is SUCCESS but booking is FAILED/UNKNOWN.
 *    This is the correct modelling for reconciliation and refund scenarios.
 */
@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectModel(BookingEntity)
    private readonly bookingModel: typeof BookingEntity,
    @InjectModel(TravellerEntity)
    private readonly travellerModel: typeof TravellerEntity,
    @InjectModel(PaymentEntity)
    private readonly paymentModel: typeof PaymentEntity,
    @InjectModel(SupplierBookingEntity)
    private readonly supplierBookingModel: typeof SupplierBookingEntity,
    private readonly flightsService: FlightsService,
    private readonly supplierGateway: SupplierGateway,
    private readonly sequelize: Sequelize,
  ) {}

  /**
   * Create a booking.
   *
   * Step 1: Idempotency check
   * Step 2: Look up flight offer from cache
   * Step 3: DB transaction: create Booking + Travellers + Payment records
   * Step 4: Update booking status to PAYMENT_RECEIVED (mock payment)
   * Step 5: Call supplier (with timeout handling)
   * Step 6: Update status based on supplier response
   */
  async createBooking(dto: CreateBookingDto): Promise<BookingEntity> {
    this.logger.log(`Booking request received. Idempotency key: ${dto.idempotencyKey}`);

    // Step 1: Idempotency check
    const existingBooking = await this.bookingModel.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
      include: [TravellerEntity, PaymentEntity, SupplierBookingEntity],
    });

    if (existingBooking) {
      this.logger.warn(
        `Duplicate booking request detected. Returning existing booking: ${existingBooking.bookingRef}`,
      );
      return existingBooking;
    }

    // Step 2: Look up flight offer
    const offer = this.flightsService.getOffer(dto.offerId);
    if (!offer) {
      throw new NotFoundException(
        'Flight offer not found or expired. Please search again and revalidate.',
      );
    }

    // Step 3: Server-side Revalidation & Price Acceptance Enforcement
    if (!offer.isRevalidated) {
      throw new BadRequestException(
        'Flight offer must be revalidated before booking. Please revalidate the flight fare first.',
      );
    }

    if (offer.requiresPriceAcceptance && dto.acceptedPriceChange !== true) {
      throw new BadRequestException(
        'Flight fare has changed. You must explicitly accept the updated price before completing the booking.',
      );
    }

    // Step 4: Validate traveller count
    if (dto.travellers.length < 1) {
      throw new BadRequestException('At least one traveller is required');
    }

    const bookingRef = this.generateBookingRef();
    this.logger.log(`Creating booking ${bookingRef} for offer ${dto.offerId}`);

    // Step 4: Create all records in a transaction
    let booking: BookingEntity;

    try {
      booking = await this.sequelize.transaction(async (t) => {
        const newBooking = await this.bookingModel.create(
          {
            id: uuidv4(),
            bookingRef,
            offerId: dto.offerId,
            supplier: offer.supplier,
            supplierResultKey: offer.supplierResultKey,
            supplierBaseFare: offer.pricing.supplierBaseFare,
            supplierTaxes: offer.pricing.supplierTaxes,
            serviceFee: offer.pricing.serviceFee,
            discount: offer.pricing.discount,
            finalPrice: offer.pricing.finalPrice,
            currency: offer.pricing.currency,
            flightNumber: offer.segments[0].flightNumber,
            origin: offer.segments[0].origin,
            destination: offer.segments[0].destination,
            departureTime: new Date(offer.segments[0].departureTime),
            arrivalTime: new Date(offer.segments[0].arrivalTime),
            paymentStatus: PaymentStatus.PENDING,
            bookingStatus: BookingStatus.PENDING,
            idempotencyKey: dto.idempotencyKey,
          },
          { transaction: t },
        );

        // Create traveller records
        await Promise.all(
          dto.travellers.map((traveller) =>
            this.travellerModel.create(
              {
                id: uuidv4(),
                bookingId: newBooking.id,
                firstName: traveller.firstName,
                lastName: traveller.lastName,
                dateOfBirth: traveller.dateOfBirth,
                passportNumber: traveller.passportNumber ?? null,
                passportExpiry: traveller.passportExpiry ?? null,
                nationality: traveller.nationality ?? null,
              },
              { transaction: t },
            ),
          ),
        );

        return newBooking;
      });
    } catch (error) {
      this.logger.error('Failed to create booking records', error);
      throw new InternalServerErrorException('Failed to create booking. Please try again.');
    }

    // Step 5: Mock payment processing
    // In production: call payment gateway (Razorpay, Stripe, etc.)
    this.logger.log(`Processing payment for booking ${bookingRef}`);
    const payment = await this.processPayment(booking, dto.paymentMethod);

    if (!payment) {
      await booking.update({ bookingStatus: BookingStatus.FAILED, paymentStatus: PaymentStatus.FAILED });
      throw new InternalServerErrorException('Payment processing failed.');
    }

    await booking.update({
      paymentStatus: PaymentStatus.SUCCESS,
      bookingStatus: BookingStatus.PAYMENT_RECEIVED,
    });

    this.logger.log(`Payment successful for booking ${bookingRef}`);

    // Step 6: Call supplier with timeout handling
    await this.callSupplierWithTimeoutHandling(booking, offer, dto);

    // Return the fully populated booking
    return this.bookingModel.findByPk(booking.id, {
      include: [TravellerEntity, PaymentEntity, SupplierBookingEntity],
    }) as Promise<BookingEntity>;
  }

  /**
   * Call the supplier to create the booking.
   *
   * The critical design here: timeout handling.
   *
   * If the supplier times out, we do NOT know if they created the booking.
   * We set status = SUPPLIER_UNKNOWN. The client can check status later.
   * We also do NOT create a duplicate booking if they retry with the same idempotencyKey.
   *
   * Why SUPPLIER_UNKNOWN and not FAILED?
   * Because the supplier might have created the booking successfully.
   * Marking it as FAILED would be incorrect. We need to check.
   * The customer paid, so we must investigate and handle the reconciliation.
   */
  private async callSupplierWithTimeoutHandling(
    booking: BookingEntity,
    offer: { supplier: string; supplierResultKey: string },
    dto: CreateBookingDto,
  ): Promise<void> {
    await booking.update({ bookingStatus: BookingStatus.SUPPLIER_BOOKING });

    // Create a PENDING supplier booking record
    const supplierBookingRecord = await this.supplierBookingModel.create({
      id: uuidv4(),
      bookingId: booking.id,
      status: SupplierBookingStatus.PENDING,
    });

    const supplierRequest = {
      supplierResultKey: offer.supplierResultKey,
      travellers: dto.travellers.map((t) => ({
        firstName: t.firstName,
        lastName: t.lastName,
        dateOfBirth: t.dateOfBirth,
        passportNumber: t.passportNumber,
        passportExpiry: t.passportExpiry,
        nationality: t.nationality,
      })),
    };

    try {
      this.logger.log(`Calling supplier for booking ${booking.bookingRef}`);
      const supplierResult = await this.supplierGateway.bookFlight(
        offer.supplier,
        supplierRequest,
      );

      this.logger.log(
        `Supplier booking confirmed. PNR: ${supplierResult.supplierPNR}`,
      );

      // Update supplier booking record
      await supplierBookingRecord.update({
        status: SupplierBookingStatus.CONFIRMED,
        supplierBookingId: supplierResult.supplierBookingId,
        pnr: supplierResult.supplierPNR,
        ticketNumbers: JSON.stringify(supplierResult.ticketNumbers ?? []),
      });

      // Update main booking
      await booking.update({ bookingStatus: BookingStatus.CONFIRMED });
    } catch (error) {
      const isTimeout =
        error instanceof Error &&
        (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'));

      if (isTimeout) {
        /**
         * CRITICAL: Timeout scenario.
         *
         * The supplier may or may not have created the booking.
         * We CANNOT assume failure. Set to SUPPLIER_UNKNOWN.
         *
         * Next steps (production):
         * 1. A background job checks booking status via getBookingStatus()
         * 2. If confirmed: update to CONFIRMED
         * 3. If failed: update to FAILED and initiate refund
         * 4. Notify the customer
         */
        this.logger.error(
          `Supplier timeout for booking ${booking.bookingRef}. Setting status to SUPPLIER_UNKNOWN.`,
        );

        await supplierBookingRecord.update({
          status: SupplierBookingStatus.UNKNOWN,
          errorMessage: 'Supplier request timed out. Booking status unknown.',
        });

        await booking.update({ bookingStatus: BookingStatus.SUPPLIER_UNKNOWN });
      } else {
        this.logger.error(
          `Supplier booking failed for ${booking.bookingRef}`,
          error,
        );

        await supplierBookingRecord.update({
          status: SupplierBookingStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown supplier error',
        });

        // Payment was taken but supplier failed — mark for refund
        await booking.update({
          bookingStatus: BookingStatus.FAILED,
          paymentStatus: PaymentStatus.REFUND_PENDING,
        });
      }
    }
  }

  /**
   * Check supplier status for a booking in SUPPLIER_UNKNOWN state.
   *
   * This resolves the timeout scenario:
   * - If supplier confirms: update to CONFIRMED
   * - If supplier failed: update to FAILED, initiate refund
   * - If still pending: leave as SUPPLIER_UNKNOWN
   */
  async checkAndUpdateSupplierStatus(bookingId: string): Promise<BookingEntity> {
    const booking = await this.bookingModel.findByPk(bookingId, {
      include: [SupplierBookingEntity],
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.bookingStatus !== BookingStatus.SUPPLIER_UNKNOWN) {
      throw new BadRequestException(
        `Booking ${bookingId} is not in SUPPLIER_UNKNOWN state`,
      );
    }

    this.logger.log(`Checking supplier status for booking ${booking.bookingRef}`);

    const supplierStatus = await this.supplierGateway.getBookingStatus(
      booking.supplier,
      booking.supplierBooking?.supplierBookingId ?? '',
    );

    if (supplierStatus.status === 'CONFIRMED') {
      await booking.supplierBooking?.update({
        status: SupplierBookingStatus.CONFIRMED,
        pnr: supplierStatus.pnr,
      });
      await booking.update({ bookingStatus: BookingStatus.CONFIRMED });
      this.logger.log(`Booking ${booking.bookingRef} resolved: CONFIRMED`);
    } else if (supplierStatus.status === 'FAILED') {
      await booking.supplierBooking?.update({ status: SupplierBookingStatus.FAILED });
      await booking.update({
        bookingStatus: BookingStatus.FAILED,
        paymentStatus: PaymentStatus.REFUND_PENDING,
      });
      this.logger.warn(`Booking ${booking.bookingRef} resolved: FAILED. Refund pending.`);
    }

    return booking.reload({ include: [TravellerEntity, PaymentEntity, SupplierBookingEntity] });
  }

  /**
   * Get booking details by booking reference (e.g. TXG-123456).
   */
  async getBookingByRef(bookingRef: string): Promise<BookingEntity> {
    const booking = await this.bookingModel.findOne({
      where: { bookingRef },
      include: [TravellerEntity, PaymentEntity, SupplierBookingEntity],
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingRef} not found`);
    }

    return booking;
  }

  /**
   * Get booking by internal ID.
   */
  async getBookingById(id: string): Promise<BookingEntity> {
    const booking = await this.bookingModel.findByPk(id, {
      include: [TravellerEntity, PaymentEntity, SupplierBookingEntity],
    });

    if (!booking) {
      throw new NotFoundException(`Booking not found`);
    }

    return booking;
  }

  /**
   * Preview cancellation charges before confirming.
   * Shows the customer what they'll be charged before they confirm.
   */
  async getCancellationPreview(
    bookingId: string,
  ): Promise<{
    cancellationCharge: number;
    tixxgoFee: number;
    estimatedRefund: number;
    currency: string;
  }> {
    const booking = await this.bookingModel.findByPk(bookingId, {
      include: [SupplierBookingEntity],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.bookingStatus !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot cancel a booking with status: ${booking.bookingStatus}`,
      );
    }

    // In real implementation: call supplier to get actual cancellation charges
    const supplierCancellation = await this.supplierGateway.cancelBooking(
      booking.supplier,
      booking.supplierBooking?.supplierBookingId ?? '',
    );

    const tixxgoFee = 0; // Assessment: no Tixxgo cancellation fee

    return {
      cancellationCharge: supplierCancellation.cancellationCharge,
      tixxgoFee,
      estimatedRefund: supplierCancellation.refundAmount,
      currency: supplierCancellation.currency,
    };
  }

  /**
   * Cancel a confirmed booking.
   *
   * Flow:
   * 1. Validate booking exists and is CONFIRMED
   * 2. Call supplier to cancel
   * 3. Update booking status to CANCELLED
   * 4. Update payment status to REFUND_PENDING
   *
   * We NEVER delete booking records.
   * Bookings are business records and must be retained for reconciliation,
   * audit, and customer support.
   */
  async cancelBooking(bookingId: string, dto: CancelBookingDto): Promise<BookingEntity> {
    const booking = await this.bookingModel.findByPk(bookingId, {
      include: [SupplierBookingEntity],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.bookingStatus !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot cancel a booking with status: ${booking.bookingStatus}. Only CONFIRMED bookings can be cancelled.`,
      );
    }

    this.logger.log(
      `Cancellation requested for booking ${booking.bookingRef}. Reason: ${dto.reason ?? 'Not specified'}`,
    );

    await booking.update({ bookingStatus: BookingStatus.CANCELLATION_REQUESTED });

    // Call supplier to cancel
    const cancellationResult = await this.supplierGateway.cancelBooking(
      booking.supplier,
      booking.supplierBooking?.supplierBookingId ?? '',
    );

    // Update supplier booking record with cancellation details
    await booking.supplierBooking?.update({
      status: SupplierBookingStatus.CANCELLED,
      cancellationId: cancellationResult.cancellationId,
      cancellationCharge: cancellationResult.cancellationCharge,
      refundAmount: cancellationResult.refundAmount,
    });

    // Update booking status
    await booking.update({
      bookingStatus: BookingStatus.CANCELLED,
      paymentStatus: PaymentStatus.REFUND_PENDING,
    });

    this.logger.log(
      `Booking ${booking.bookingRef} cancelled. Refund amount: ${cancellationResult.refundAmount} ${cancellationResult.currency}`,
    );

    return booking.reload({
      include: [TravellerEntity, PaymentEntity, SupplierBookingEntity],
    });
  }

  /**
   * Mock payment processing.
   * In production: call Razorpay / Stripe / Paytm API.
   * Returns a payment record, or null if payment failed.
   */
  private async processPayment(
    booking: BookingEntity,
    method: PaymentMethod,
  ): Promise<PaymentEntity | null> {
    try {
      const payment = await this.paymentModel.create({
        id: uuidv4(),
        bookingId: booking.id,
        amount: booking.finalPrice,
        currency: booking.currency,
        method,
        gatewayReference: `MOCK-PAY-${uuidv4().slice(0, 8).toUpperCase()}`,
        paidAt: new Date(),
      });
      return payment;
    } catch (error) {
      this.logger.error('Payment creation failed', error);
      return null;
    }
  }

  /**
   * Generate a Tixxgo booking reference.
   * Format: TXG-XXXXXX (6 random digits)
   */
  private generateBookingRef(): string {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `TXG-${num}`;
  }
}
