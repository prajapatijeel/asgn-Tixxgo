import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { FlightsService } from './flights.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { RevalidateFlightDto } from './dto/revalidate-flight.dto';
import { ApiResponse } from '../common/models/api-response.model';

/**
 * FlightsController — thin HTTP layer.
 *
 * Responsibilities:
 * - Accept HTTP requests
 * - Validate request body (via ValidationPipe)
 * - Delegate to FlightsService
 * - Wrap response in ApiResponse
 * - Return appropriate HTTP status codes
 *
 * What controllers do NOT contain:
 * - Business logic
 * - Supplier-specific knowledge
 * - Database queries
 * - Pricing calculations
 *
 * ValidationPipe with transform:true automatically transforms
 * plain JSON into DTO class instances so class-validator decorators work.
 */
@ApiTags('Flights')
@Controller('api/flights')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  /**
   * POST /api/flights/search
   *
   * Search for available flights.
   * Returns a list of supplier-independent FlightOfferResponse objects.
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search flights',
    description:
      'Search for available flight offers across connected suppliers using normalized criteria. Returns Tixxgo normalized flight offer models with supplier fields stripped.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Found available flight offers matching search criteria.',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Bad Request - Validation error in search request parameters.',
  })
  @SwaggerResponse({
    status: 500,
    description: 'Internal server error or supplier communication failure.',
  })
  async searchFlights(@Body() dto: SearchFlightsDto) {
    const offers = await this.flightsService.searchFlights(dto);
    return new ApiResponse(offers, `Found ${offers.length} flight(s)`);
  }

  /**
   * POST /api/flights/revalidate
   *
   * Revalidate price and availability for a specific offer.
   * Must be called before proceeding to payment.
   *
   * Returns priceStatus: PRICE_CONFIRMED | PRICE_CHANGED | FLIGHT_UNAVAILABLE
   */
  @Post('revalidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revalidate flight price and availability',
    description:
      'Revalidate flight pricing and seat availability with the supplier before proceeding to booking. Flight pricing must be revalidated before payment. Returns priceStatus: PRICE_CONFIRMED | PRICE_CHANGED | FLIGHT_UNAVAILABLE.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Fare revalidation result (PRICE_CONFIRMED, PRICE_CHANGED, or FLIGHT_UNAVAILABLE).',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Bad Request - Invalid or missing offer ID.',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Not Found - Flight offer expired or not found.',
  })
  async revalidateFlight(@Body() dto: RevalidateFlightDto) {
    const result = await this.flightsService.revalidateFlight(dto);
    return new ApiResponse(result, result.message);
  }
}
