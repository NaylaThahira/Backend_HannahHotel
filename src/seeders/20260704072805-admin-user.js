
'use strict';
const bcrypt = require('bcryptjs');
module.exports = {
  async up(queryInterface) {
    const columns = await queryInterface.describeTable('Admins');
    const password = await bcrypt.hash('12345', 10);
    if (!columns.location) {
      await queryInterface.bulkInsert('Admins', [{ name: 'Admin Utama', email: 'admin@hannahhotel.com', password, role: 'superadmin', createdAt: new Date(), updatedAt: new Date() }]);
      return;
    }
    for (const location of ['painan', 'padang']) {
      const email = `admin@hannahhotel${location}.com`;
      const [existing] = await queryInterface.sequelize.query('SELECT id FROM "Admins" WHERE email = :email', { replacements: { email } });
      if (!existing.length) await queryInterface.bulkInsert('Admins', [{ name: `Admin ${location === 'padang' ? 'Padang' : 'Painan'}`, email, ...(columns.username ? { username: `admin${location}` } : {}), password, role: location === 'painan' ? 'superadmin' : 'admin', location, createdAt: new Date(), updatedAt: new Date() }]);
    }
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('Admins', { email: ['admin@hannahhotel.com', 'admin@hannahhotelpainan.com', 'admin@hannahhotelpadang.com'] });
  }
};
