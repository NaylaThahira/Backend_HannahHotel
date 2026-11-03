'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Facilities', 'price', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('Facilities', 'imageUrl', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('Facilities', 'facilities', { type: Sequelize.JSON, allowNull: true, defaultValue: [] });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Facilities', 'facilities');
    await queryInterface.removeColumn('Facilities', 'imageUrl');
    await queryInterface.removeColumn('Facilities', 'price');
  }
};
