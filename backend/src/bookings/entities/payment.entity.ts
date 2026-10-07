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

export enum PaymentMethod {
  CARD = 'CARD',
  UPI = 'UPI',
  NET_BANKING = 'NET_BANKING',
  MOCK = 'MOCK', // For assessment
}

/**
 * Payment entity — tracks a payment attempt for a booking.
 *
 * Why separate from Booking?
 * Payment can fail and be retried. Keeping payments separate means
 * we have a history of payment attempts. The booking itself just
 * stores the final paymentStatus.
 *
 * In production: integrate a real payment gateway (Razorpay, Stripe).
 * The gatewayReference would be the gateway's transaction ID.
 */
@Table({ tableName: 'payments', timestamps: true, underscored: true })
export class PaymentEntity extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => BookingEntity)
  @Column({ type: DataType.UUID, allowNull: false })
  declare bookingId: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  declare amount: number;

  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'INR' })
  declare currency: string;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentMethod)),
    allowNull: false,
    defaultValue: PaymentMethod.MOCK,
  })
  declare method: PaymentMethod;

  /**
   * Reference from the payment gateway (Razorpay transaction ID, etc.)
   * In mock: auto-generated reference.
   */
  @Column({ type: DataType.STRING(200), allowNull: true })
  declare gatewayReference: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare paidAt: Date | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => BookingEntity)
  declare booking: BookingEntity;
}
