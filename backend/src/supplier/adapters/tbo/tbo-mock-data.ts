import { SearchFlightsDto } from '../../../flights/dto/search-flights.dto';
import {
  SupplierFlightResult,
  SupplierRevalidationResult,
  SupplierBookingRequest,
  SupplierBookingResult,
  SupplierBookingStatus,
  SupplierCancellationResult,
} from '../../models/supplier-flight.model';

/**
 * Mock TBO API responses.
 *
 * In a real implementation, these would be live HTTP calls to TBO's API.
 *
 * Why a separate file for mock data?
 * - TboAdapter stays clean — just transformation logic.
 * - Easy to swap real API calls in without touching the transformation.
 * - Demonstrates what TBO ACTUALLY returns (supplier-specific format).
 *
 * Note the format: this is what TBO would give us.
 * The adapter's job is to convert this into our SupplierFlightResult.
 */

export interface TboFlightOption {
  ResultIndex: string;
  Source: number;
  Segments: TboSegment[][];
  Fare: TboFare;
  FareClassification: { Type: string };
}

export interface TboSegment {
  Airline: { AirlineCode: string; AirlineName: string; FlightNumber: string };
  Origin: { Airport: { AirportCode: string }; DepTime: string };
  Destination: { Airport: { AirportCode: string }; ArrTime: string };
  Duration: number; // minutes
  CabinClass: number;
  Baggage: string;
  CabinBaggage: string;
  AvailableSeats: number;
}

export interface TboFare {
  BaseFare: number;
  Tax: number;
  Currency: string;
}

/**
 * Generate mock TBO search results for a given route/date.
 * These represent what TBO's actual API would return.
 */
export function generateMockTboResults(params: SearchFlightsDto): TboFlightOption[] {
  const { origin, destination, departureDate, cabinClass } = params;

  // Map our CabinClass enum to TBO's numeric cabin class
  const cabinClassMap: Record<string, number> = {
    ECONOMY: 1,
    PREMIUM_ECONOMY: 2,
    BUSINESS: 3,
    FIRST: 4,
  };

  const tboClass = cabinClassMap[cabinClass] ?? 1;

  // Build departure and arrival times for mock flights
  const dep1 = `${departureDate}T06:00:00`;
  const arr1 = `${departureDate}T07:45:00`;
  const dep2 = `${departureDate}T09:30:00`;
  const arr2 = `${departureDate}T11:20:00`;
  const dep3 = `${departureDate}T14:15:00`;
  const arr3 = `${departureDate}T16:05:00`;

  return [
    {
      ResultIndex: `TBO-RESULT-${origin}-${destination}-001`,
      Source: 1,
      Segments: [
        [
          {
            Airline: {
              AirlineCode: 'AI',
              AirlineName: 'Air India',
              FlightNumber: 'AI-441',
            },
            Origin: {
              Airport: { AirportCode: origin },
              DepTime: dep1,
            },
            Destination: {
              Airport: { AirportCode: destination },
              ArrTime: arr1,
            },
            Duration: 105,
            CabinClass: tboClass,
            Baggage: '15 kg',
            CabinBaggage: '7 kg',
            AvailableSeats: 9,
          },
        ],
      ],
      Fare: { BaseFare: 5200, Tax: 950, Currency: 'INR' },
      FareClassification: { Type: 'Refundable' },
    },
    {
      ResultIndex: `TBO-RESULT-${origin}-${destination}-002`,
      Source: 1,
      Segments: [
        [
          {
            Airline: {
              AirlineCode: '6E',
              AirlineName: 'IndiGo',
              FlightNumber: '6E-2341',
            },
            Origin: {
              Airport: { AirportCode: origin },
              DepTime: dep2,
            },
            Destination: {
              Airport: { AirportCode: destination },
              ArrTime: arr2,
            },
            Duration: 110,
            CabinClass: tboClass,
            Baggage: '15 kg',
            CabinBaggage: '7 kg',
            AvailableSeats: 4,
          },
        ],
      ],
      Fare: { BaseFare: 4100, Tax: 820, Currency: 'INR' },
      FareClassification: { Type: 'Non-Refundable' },
    },
    {
      ResultIndex: `TBO-RESULT-${origin}-${destination}-003`,
      Source: 1,
      Segments: [
        [
          {
            Airline: {
              AirlineCode: 'SG',
              AirlineName: 'SpiceJet',
              FlightNumber: 'SG-8169',
            },
            Origin: {
              Airport: { AirportCode: origin },
              DepTime: dep3,
            },
            Destination: {
              Airport: { AirportCode: destination },
              ArrTime: arr3,
            },
            Duration: 110,
            CabinClass: tboClass,
            Baggage: '20 kg',
            CabinBaggage: '7 kg',
            AvailableSeats: 2,
          },
        ],
      ],
      Fare: { BaseFare: 3800, Tax: 750, Currency: 'INR' },
      FareClassification: { Type: 'Refundable' },
    },
  ];
}

/**
 * Mock revalidation — simulates TBO's revalidation API.
 * In real TBO, price might change between search and revalidate.
 */
export function mockTboRevalidate(
  resultIndex: string,
): { IsValid: boolean; Fare: TboFare } {

  // First flight: ₹6,249 → ₹6,449
  if (resultIndex.includes('-001')) {
    return {
      IsValid: true,
      Fare: {
        BaseFare: 5400,
        Tax: 950,
        Currency: 'INR',
      },
    };
  }

  // Second flight: ₹5,019 → ₹5,319
  if (resultIndex.includes('-002')) {
    return {
      IsValid: true,
      Fare: {
        BaseFare: 4400,
        Tax: 820,
        Currency: 'INR',
      },
    };
  }

  // Third flight: price stays the same
  return {
    IsValid: true,
    Fare: {
      BaseFare: 3800,
      Tax: 750,
      Currency: 'INR',
    },
  };
}

/**
 * Mock booking — simulates TBO booking API.
 */
export function mockTboBook(
  resultIndex: string,
  travellers: any[] = [],
): {
  PNR: string;
  BookingId: string;
  Status: string;
  TicketNumbers: string[];
} {
  const hasTimeoutTrigger = Array.isArray(travellers) && travellers.some(
    (t) =>
      (typeof t?.firstName === 'string' && t.firstName.toUpperCase() === 'TIMEOUT') ||
      (typeof t?.lastName === 'string' && t.lastName.toUpperCase() === 'TIMEOUT'),
  );

  if (hasTimeoutTrigger) {
    throw new Error('Supplier request timed out ETIMEDOUT');
  }

  return {
    PNR: `PNR${Math.floor(Math.random() * 900000) + 100000}`,
    BookingId: `TBO-BK-${Date.now()}`,
    Status: 'Confirmed',
    TicketNumbers: ['TKT-001', 'TKT-002'],
  };
}

/**
 * Mock booking status check — simulates TBO status inquiry API.
 */
export function mockTboGetStatus(bookingId: string): {
  BookingId: string;
  Status: string;
  PNR: string;
} {
  return {
    BookingId: bookingId,
    Status: 'Confirmed',
    PNR: `PNR${Math.floor(Math.random() * 900000) + 100000}`,
  };
}

/**
 * Mock cancellation — simulates TBO cancellation API.
 */
export function mockTboCancel(bookingId: string): {
  CancellationId: string;
  CancellationCharge: number;
  RefundAmount: number;
  Currency: string;
} {
  return {
    CancellationId: `CXLD-${bookingId}-${Date.now()}`,
    CancellationCharge: 500,
    RefundAmount: 5699,
    Currency: 'INR',
  };
}

/**
 * Convert TBO cabin class number back to string.
 */
export function mapTboCabinClass(tboClass: number): string {
  const map: Record<number, string> = {
    1: 'ECONOMY',
    2: 'PREMIUM_ECONOMY',
    3: 'BUSINESS',
    4: 'FIRST',
  };
  return map[tboClass] ?? 'ECONOMY';
}

/**
 * Format TBO duration (minutes) to human-readable string.
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
