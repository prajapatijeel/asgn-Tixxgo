import { IsString, IsDateString, IsInt, IsEnum, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CabinClass } from '../models/flight-offer.model';

/**
 * DTO for POST /api/flights/search
 *
 * Why a DTO?
 * class-validator decorators enforce the shape of incoming requests
 * before the data ever reaches our service. If validation fails, NestJS
 * automatically returns HTTP 400 with field-level error messages.
 *
 * Why not trust the client?
 * The client could send anything. We must validate on the server.
 */
export class SearchFlightsDto {
  @ApiProperty({
    example: 'AMD',
    description: 'Origin airport IATA code',
  })
  @IsString()
  @IsNotEmpty()
  origin!: string;

  @ApiProperty({
    example: 'DEL',
    description: 'Destination airport IATA code',
  })
  @IsString()
  @IsNotEmpty()
  destination!: string;

  /**
   * ISO date string YYYY-MM-DD
   * IsDateString validates format, but we also check business rules in the service.
   */
  @ApiProperty({
    example: '2026-10-15',
    description: 'Departure date in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsNotEmpty()
  departureDate!: string;

  @ApiProperty({
    example: 1,
    minimum: 1,
    maximum: 9,
    description: 'Number of adult passengers',
  })
  @IsInt()
  @Min(1)
  @Max(9)
  adults!: number;

  @ApiProperty({
    enum: CabinClass,
    example: CabinClass.ECONOMY,
    description: 'Cabin class selection',
  })
  @IsEnum(CabinClass)
  cabinClass!: CabinClass;
}
