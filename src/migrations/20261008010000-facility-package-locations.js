'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      for (const table of ['Facilities', 'Packages']) {
        await queryInterface.addColumn(table, 'location', {
          type: Sequelize.STRING, allowNull: false, defaultValue: 'painan'
        }, { transaction });
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      for (const table of ['Facilities', 'Packages']) await queryInterface.removeColumn(table, 'location', { transaction });
    });
  }
};
