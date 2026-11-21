'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'Galleries',
        'location',
        {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'painan',
        },
        { transaction }
      );

      await queryInterface.addIndex('Galleries', ['location', 'createdAt'], {
        name: 'galleries_location_created_at_idx',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('Galleries', 'galleries_location_created_at_idx', { transaction });
      await queryInterface.removeColumn('Galleries', 'location', { transaction });
    });
  },
};

