'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      booking_ref: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      offer_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      supplier: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      supplier_result_key: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      supplier_base_fare: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      supplier_taxes: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      service_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      final_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'INR',
      },
      flight_number: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      origin: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      destination: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      departure_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      arrival_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      payment_status: {
        type: Sequelize.ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUND_PENDING', 'REFUNDED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      booking_status: {
        type: Sequelize.ENUM(
          'PENDING',
          'PAYMENT_RECEIVED',
          'SUPPLIER_BOOKING',
          'SUPPLIER_UNKNOWN',
          'CONFIRMED',
          'FAILED',
          'CANCELLATION_REQUESTED',
          'CANCELLED',
        ),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      idempotency_key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('bookings', ['booking_ref']);
    await queryInterface.addIndex('bookings', ['idempotency_key']);
    await queryInterface.addIndex('bookings', ['booking_status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bookings');
  },
};
