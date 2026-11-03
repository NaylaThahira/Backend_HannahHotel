'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('Admins', 'username', {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true
      }, { transaction });
      const password = await bcrypt.hash('12345', 10);
      for (const location of ['padang', 'painan']) {
        await queryInterface.bulkUpdate('Admins', {
          username: `admin${location}`, password, updatedAt: new Date()
        }, { email: `admin@hannahhotel${location}.com`, location }, { transaction });
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Admins', 'username');
  }
};
