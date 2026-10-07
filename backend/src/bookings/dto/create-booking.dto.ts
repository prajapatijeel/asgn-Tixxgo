import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsDateString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/payment.entity';

export class TravellerDto {
  @ApiProperty({
    example: 'Jeel',
    description: 'First name of the traveller',
  })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({
    example: 'Prajapati',
    description: 'Last name of the traveller',
  })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    example: '1995-08-20',
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth!: string;

  @ApiPropertyOptional({
    example: 'A1234567',
    description: 'Passport number (optional for domestic flights)',
  })
  @IsString()
  @IsOptional()
  passportNumber?: string;

  @ApiPropertyOptional({
    example: '2030-12-31',
    description: 'Passport expiry date in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsOptional()
  passportExpiry?: string;

  @ApiPropertyOptional({
    example: 'IN',
    description: 'Nationality ISO country code',
  })
  @IsString()
  @IsOptional()
  nationality?: string;
}

export class ContactInfoDto {
  @ApiProperty({
    example: 'jeel@example.com',
    description: 'Contact email address for booking confirmation',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '+919876543210',
    description: 'Contact phone number with country code',
  })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

/**
 * DTO for POST /api/bookings
 *
 * What the client sends to create a booking.
 *
 * idempotencyKey:
 * The client generates this ONCE before clicking Pay.
 * If they double-click or the network retries, the same key is sent.
 * The backend uses this key to prevent duplicate bookings.
 *
 * offerId:
 * The Tixxgo-assigned ID from the search results.
 * Never the supplier's result key.
 */
export class CreateBookingDto {
  @ApiProperty({
    example: 'off_tbo_101',
    description: 'Tixxgo-assigned flight offer ID from search results',
  })
  @IsString()
  @IsNotEmpty()
  offerId!: string;

  /**
   * Client-generated unique key for this payment attempt.
   * Use: UUID generated on the frontend before payment.
   * If the same key arrives twice, return the existing booking.
   */
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Client-generated UUID idempotency key to prevent duplicate bookings',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @ApiProperty({
    type: [TravellerDto],
    description: 'Array of passenger/traveller details',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TravellerDto)
  travellers!: TravellerDto[];

  @ApiProperty({
    type: ContactInfoDto,
    description: 'Primary contact information for the booking',
  })
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo!: ContactInfoDto;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.MOCK,
    description: 'Payment method for completing booking',
  })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    example: true,
    description: 'Explicit customer acceptance of price change if fare changed during revalidation',
  })
  @IsOptional()
  @IsBoolean()
  acceptedPriceChange?: boolean;
}
