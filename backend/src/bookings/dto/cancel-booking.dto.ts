import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for POST /api/bookings/:id/cancel
 */
export class CancelBookingDto {
  @ApiPropertyOptional({
    example: 'Travel plans changed',
    description: 'Reason for booking cancellation',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
