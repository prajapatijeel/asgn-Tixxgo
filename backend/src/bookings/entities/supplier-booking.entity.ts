import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { BookingEntity } from './booking.entity';

export enum SupplierBookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  UNKNOWN = 'UNKNOWN',   // Timeout — we don't know the outcome
  CANCELLED = 'CANCELLED',
}

/**
 * SupplierBooking entity — tracks the booking with the supplier (TBO etc.)
 *
 * Why separate from Booking?
 * The customer-facing Booking and the supplier-facing booking are
 * separate operations. The supplier booking might:
 * - Succeed (normal case)
 * - Fail (supplier error)
 * - Timeout (UNKNOWN — we must check status separately)
 *
 * Keeping these separate means:
 * 1. We can track supplier-specific data (PNR, ticket numbers) without
 *    polluting the customer-facing Booking table.
 * 2. We can retry or check status independently.
 * 3. Reconciliation is clear: Booking has paymentStatus, SupplierBooking has its own status.
 *
 * The UNKNOWN state is critical:
 * If our request to the supplier times out, we DON'T know if they created
 * the booking. We set status = UNKNOWN and check later.
 */
@Table({ tableName: 'supplier_bookings', timestamps: true, underscored: true })
export class SupplierBookingEntity extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => BookingEntity)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  declare bookingId: string;

  @Column({
    type: DataType.ENUM(...Object.values(SupplierBookingStatus)),
    allowNull: false,
    defaultValue: SupplierBookingStatus.PENDING,
  })
  declare status: SupplierBookingStatus;

  /** Supplier's booking ID (e.g. TBO booking reference) */
  @Column({ type: DataType.STRING(200), allowNull: true })
  declare supplierBookingId: string | null;

  /** Airline PNR */
  @Column({ type: DataType.STRING(20), allowNull: true })
  declare pnr: string | null;

  /** Ticket numbers (JSON array) */
  @Column({ type: DataType.TEXT, allowNull: true })
  declare ticketNumbers: string | null;

  /** Error message if booking failed */
  @Column({ type: DataType.TEXT, allowNull: true })
  declare errorMessage: string | null;

  /** Cancellation ID from supplier */
  @Column({ type: DataType.STRING(200), allowNull: true })
  declare cancellationId: string | null;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  declare cancellationCharge: number | null;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  declare refundAmount: number | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => BookingEntity)
  declare booking: BookingEntity;
}
