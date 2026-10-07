import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { BookingsService } from './bookings.service';
import { BookingEntity, BookingStatus, PaymentStatus } from './entities/booking.entity';
import { TravellerEntity } from './entities/traveller.entity';
import { PaymentEntity } from './entities/payment.entity';
import { SupplierBookingEntity, SupplierBookingStatus } from './entities/supplier-booking.entity';
import { FlightsService } from '../flights/flights.service';
import { SupplierGateway } from '../supplier/supplier-gateway.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FlightOffer } from '../flights/models/flight-offer.model';

describe('BookingsService - Server-Side Revalidation & Price Acceptance', () => {
  let service: BookingsService;
  let flightsService: jest.Mocked<Partial<FlightsService>>;
  let supplierGateway: jest.Mocked<Partial<SupplierGateway>>;
  let bookingModel: any;
  let travellerModel: any;
  let paymentModel: any;
  let supplierBookingModel: any;
  let sequelize: any;

  const mockOffer: FlightOffer = {
    offerId: 'offer-123',
    supplier: 'TBO',
    supplierResultKey: 'res-123',
    segments: [
      {
        airline: 'Air India',
        airlineCode: 'AI',
        flightNumber: 'AI-441',
        origin: 'AMD',
        destination: 'DEL',
        departureTime: '2026-10-15T06:00:00',
        arrivalTime: '2026-10-15T07:45:00',
        duration: '1h 45m',
        cabinClass: 'ECONOMY' as any,
      },
    ],
    pricing: {
      supplierBaseFare: 5200,
      supplierTaxes: 950,
      serviceFee: 299,
      discount: -200,
      finalPrice: 6249,
      currency: 'INR',
    },
    baggage: { checkIn: '15 kg', cabin: '7 kg' },
    isRefundable: true,
    seatsAvailable: 9,
    isRevalidated: false,
    requiresPriceAcceptance: false,
  };

  const createDto: CreateBookingDto = {
    offerId: 'offer-123',
    idempotencyKey: 'idemp-uuid-1',
    travellers: [
      {
        firstName: 'Jeel',
        lastName: 'Prajapati',
        dateOfBirth: '1995-08-20',
      },
    ],
    contactInfo: {
      email: 'jeel@example.com',
      phone: '+919876543210',
    },
    paymentMethod: 'MOCK' as any,
  };

  beforeEach(async () => {
    flightsService = {
      getOffer: jest.fn(),
    };

    supplierGateway = {
      bookFlight: jest.fn(),
    };

    bookingModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      findByPk: jest.fn(),
    };

    travellerModel = {
      create: jest.fn().mockResolvedValue({}),
    };

    paymentModel = {
      create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
    };

    supplierBookingModel = {
      create: jest.fn().mockResolvedValue({
        update: jest.fn().mockResolvedValue({}),
      }),
    };

    sequelize = {
      transaction: jest.fn().mockImplementation(async (cb) => cb('mock-transaction')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getModelToken(BookingEntity), useValue: bookingModel },
        { provide: getModelToken(TravellerEntity), useValue: travellerModel },
        { provide: getModelToken(PaymentEntity), useValue: paymentModel },
        { provide: getModelToken(SupplierBookingEntity), useValue: supplierBookingModel },
        { provide: FlightsService, useValue: flightsService },
        { provide: SupplierGateway, useValue: supplierGateway },
        { provide: Sequelize, useValue: sequelize },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('1. should reject booking if offer is NOT revalidated', async () => {
    const unvalidatedOffer = { ...mockOffer, isRevalidated: false };
    flightsService.getOffer!.mockReturnValue(unvalidatedOffer);

    await expect(service.createBooking(createDto)).rejects.toThrow(BadRequestException);
    await expect(service.createBooking(createDto)).rejects.toThrow(
      'Flight offer must be revalidated before booking',
    );
  });

  it('2. should allow booking after PRICE_CONFIRMED revalidation', async () => {
    const confirmedOffer = {
      ...mockOffer,
      isRevalidated: true,
      requiresPriceAcceptance: false,
    };
    flightsService.getOffer!.mockReturnValue(confirmedOffer);

    const mockCreatedBooking = {
      id: 'book-uuid-1',
      bookingRef: 'TXG-123456',
      finalPrice: 6249,
      currency: 'INR',
      supplier: 'TBO',
      supplierResultKey: 'res-123',
      update: jest.fn().mockResolvedValue({}),
    };

    bookingModel.create.mockResolvedValue(mockCreatedBooking);
    bookingModel.findByPk.mockResolvedValue(mockCreatedBooking);
    supplierGateway.bookFlight!.mockResolvedValue({
      supplierBookingId: 'sup-bk-1',
      supplierPNR: 'PNR123',
      status: 'CONFIRMED',
      ticketNumbers: ['TK-1'],
    });

    const result = await service.createBooking(createDto);
    expect(result).toBeDefined();
    expect(bookingModel.create).toHaveBeenCalled();
  });

  it('3. should reject booking after PRICE_CHANGED revalidation if customer did NOT accept new price', async () => {
    const priceChangedOffer = {
      ...mockOffer,
      isRevalidated: true,
      requiresPriceAcceptance: true,
    };
    flightsService.getOffer!.mockReturnValue(priceChangedOffer);

    await expect(service.createBooking(createDto)).rejects.toThrow(BadRequestException);
    await expect(service.createBooking(createDto)).rejects.toThrow(
      'Flight fare has changed. You must explicitly accept the updated price',
    );
  });

  it('4. should allow booking after PRICE_CHANGED revalidation if customer accepted new price', async () => {
    const priceChangedOffer = {
      ...mockOffer,
      isRevalidated: true,
      requiresPriceAcceptance: true,
    };
    flightsService.getOffer!.mockReturnValue(priceChangedOffer);

    const dtoWithAcceptance: CreateBookingDto = {
      ...createDto,
      acceptedPriceChange: true,
    };

    const mockCreatedBooking = {
      id: 'book-uuid-2',
      bookingRef: 'TXG-654321',
      finalPrice: 6500,
      currency: 'INR',
      supplier: 'TBO',
      supplierResultKey: 'res-123',
      update: jest.fn().mockResolvedValue({}),
    };

    bookingModel.create.mockResolvedValue(mockCreatedBooking);
    bookingModel.findByPk.mockResolvedValue(mockCreatedBooking);
    supplierGateway.bookFlight!.mockResolvedValue({
      supplierBookingId: 'sup-bk-2',
      supplierPNR: 'PNR456',
      status: 'CONFIRMED',
      ticketNumbers: ['TK-2'],
    });

    const result = await service.createBooking(dtoWithAcceptance);
    expect(result).toBeDefined();
  });

  it('5. should return existing booking when duplicate idempotencyKey is sent', async () => {
    const existing = { id: 'book-existing', bookingRef: 'TXG-999999' };
    bookingModel.findOne.mockResolvedValue(existing);

    const result = await service.createBooking(createDto);
    expect(result).toBe(existing);
    expect(flightsService.getOffer).not.toHaveBeenCalled();
  });

  it('6. should set SUPPLIER_UNKNOWN status when supplier request times out', async () => {
    const confirmedOffer = {
      ...mockOffer,
      isRevalidated: true,
      requiresPriceAcceptance: false,
    };
    flightsService.getOffer!.mockReturnValue(confirmedOffer);

    const mockBookingUpdate = jest.fn().mockResolvedValue({});
    const mockCreatedBooking = {
      id: 'book-timeout-1',
      bookingRef: 'TXG-777777',
      finalPrice: 6249,
      currency: 'INR',
      supplier: 'TBO',
      supplierResultKey: 'res-123',
      update: mockBookingUpdate,
    };

    bookingModel.create.mockResolvedValue(mockCreatedBooking);
    bookingModel.findByPk.mockResolvedValue(mockCreatedBooking);

    supplierGateway.bookFlight!.mockRejectedValue(new Error('Request timed out ETIMEDOUT'));

    await service.createBooking(createDto);

    expect(mockBookingUpdate).toHaveBeenCalledWith({
      bookingStatus: BookingStatus.SUPPLIER_UNKNOWN,
    });
  });
});
