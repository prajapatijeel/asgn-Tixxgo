'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('supplier_bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'CONFIRMED', 'FAILED', 'UNKNOWN', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      supplier_booking_id: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      pnr: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      ticket_numbers: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cancellation_id: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      cancellation_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      refund_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
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

    await queryInterface.addIndex('supplier_bookings', ['booking_id']);
    await queryInterface.addIndex('supplier_bookings', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('supplier_bookings');
  },
};
