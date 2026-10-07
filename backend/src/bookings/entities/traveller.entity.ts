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

/**
 * Traveller entity — stores information about each passenger.
 *
 * One booking can have multiple travellers (adults on the booking).
 * We store a snapshot of traveller data at booking time.
 *
 * Why not a separate "users" table?
 * Assessment scope: we treat each booking as independent.
 * In production, you might link travellers to registered user profiles.
 */
@Table({ tableName: 'travellers', timestamps: true, underscored: true })
export class TravellerEntity extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => BookingEntity)
  @Column({ type: DataType.UUID, allowNull: false })
  declare bookingId: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare firstName: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare lastName: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare dateOfBirth: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  declare passportNumber: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare passportExpiry: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  declare nationality: string | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => BookingEntity)
  declare booking: BookingEntity;
}
