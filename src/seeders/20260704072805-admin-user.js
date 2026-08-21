'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await queryInterface.bulkInsert('Admins', [{
      name: 'Admin Utama',
      email: 'admin@hannahhotel.com',
      password: hashedPassword,
      role: 'superadmin',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Admins', { email: 'admin@hannahhotel.com' }, {});
  }
};