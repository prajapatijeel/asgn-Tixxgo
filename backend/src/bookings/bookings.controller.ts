import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { ApiResponse } from '../common/models/api-response.model';
import { BookingSummary } from './models/booking-summary.model';

/**
 * BookingsController — thin HTTP layer for booking operations.
 *
 * Endpoints:
 * POST   /api/bookings                          Create a booking
 * GET    /api/bookings                          List booking summaries
 * GET    /api/bookings/:ref                     Get booking by reference
 * POST   /api/bookings/:id/cancel              Cancel a confirmed booking
 * GET    /api/bookings/:id/cancel-preview      Get cancellation charges
 * POST   /api/bookings/:id/check-status        Check supplier status (for UNKNOWN bookings)
 */
@ApiTags('Bookings')
@Controller('api/bookings')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all bookings',
    description:
      'Return customer-safe booking summaries ordered newest first. This assessment endpoint is unauthenticated and returns the available booking records.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Booking summaries retrieved successfully. Returns an empty array when no bookings exist.',
  })
  async getBookings(): Promise<ApiResponse<BookingSummary[]>> {
    const bookings = await this.bookingsService.getBookings();
    return new ApiResponse(bookings, `Found ${bookings.length} booking(s)`);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a flight booking',
    description:
      'Create a new flight booking with passenger details, contact info, and payment. Enforces idempotency via idempotencyKey to prevent duplicate bookings.',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Booking created successfully.',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Bad Request - Validation error, offer expired, or invalid payment.',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Not Found - Offer ID not found.',
  })
  async createBooking(@Body() dto: CreateBookingDto) {
    const booking = await this.bookingsService.createBooking(dto);
    return new ApiResponse(this.sanitize(booking), 'Booking created successfully');
  }

  @Get(':ref')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get booking by reference',
    description: 'Retrieve booking details using the unique booking reference string (e.g. TXG-ABC1234).',
  })
  @ApiParam({
    name: 'ref',
    description: 'Unique booking reference code (e.g. TXG-ABC1234)',
    example: 'TXG-ABC1234',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Booking details retrieved successfully.',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Not Found - Booking reference does not exist.',
  })
  async getBooking(@Param('ref') ref: string) {
    const booking = await this.bookingsService.getBookingByRef(ref);
    return new ApiResponse(this.sanitize(booking));
  }

  @Get(':id/cancel-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get cancellation charges preview',
    description: 'Calculate cancellation penalty, service fee, and net refund amount before confirming cancellation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Booking UUID',
    example: 'd3b07384-d113-40e4-830f-19a6a3721345',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Cancellation charges and refund preview calculated successfully.',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Not Found - Booking ID not found.',
  })
  async getCancellationPreview(@Param('id') id: string) {
    const preview = await this.bookingsService.getCancellationPreview(id);
    return new ApiResponse(preview, 'Cancellation charges calculated');
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a booking',
    description: 'Cancel an existing confirmed flight booking and process refund.',
  })
  @ApiParam({
    name: 'id',
    description: 'Booking UUID',
    example: 'd3b07384-d113-40e4-830f-19a6a3721345',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Booking cancelled successfully.',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Bad Request - Booking cannot be cancelled (e.g. already cancelled).',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Not Found - Booking ID not found.',
  })
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    const booking = await this.bookingsService.cancelBooking(id, dto);
    return new ApiResponse(this.sanitize(booking), 'Booking cancelled successfully');
  }

  @Post(':id/check-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check and update supplier status',
    description: 'Query supplier status for pending or UNKNOWN bookings and synchronize database status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Booking UUID',
    example: 'd3b07384-d113-40e4-830f-19a6a3721345',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Booking status updated from supplier.',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Not Found - Booking ID not found.',
  })
  async checkSupplierStatus(@Param('id') id: string) {
    const booking = await this.bookingsService.checkAndUpdateSupplierStatus(id);
    return new ApiResponse(this.sanitize(booking), 'Booking status updated');
  }

  /**
   * Remove supplier-internal fields before sending to client.
   * We never expose supplierResultKey or raw supplier data to Angular.
   */
  private sanitize(booking: InstanceType<typeof import('./entities/booking.entity').BookingEntity>) {
    const plain = booking.toJSON() as Record<string, unknown>;
    // Remove internal supplier fields
    delete plain['supplierResultKey'];
    return plain;
  }
}
