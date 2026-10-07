import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for POST /api/flights/revalidate
 *
 * The client sends only the offerId — a Tixxgo-generated opaque ID.
 * The backend maps this to the supplier's result key internally.
 *
 * Why not send the full flight details?
 * We don't trust the client's price. We fetch fresh pricing from the
 * supplier using our stored offerId mapping. This prevents price manipulation.
 */
export class RevalidateFlightDto {
  @ApiProperty({
    example: 'off_tbo_101',
    description: 'Tixxgo-generated flight offer ID from search results',
  })
  @IsString()
  @IsNotEmpty()
  offerId!: string;
}
