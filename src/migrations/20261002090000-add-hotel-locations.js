'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('Admins', 'location', { type: Sequelize.STRING, allowNull: false, defaultValue: 'painan' }, { transaction });
      await queryInterface.addColumn('Rooms', 'location', { type: Sequelize.STRING, allowNull: false, defaultValue: 'painan' }, { transaction });
      await queryInterface.addColumn('Rooms', 'createdByAdminId', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Admins', key: 'id' }, onDelete: 'SET NULL' }, { transaction });
      const [admins] = await queryInterface.sequelize.query('SELECT * FROM "Admins" WHERE email IN (:emails) ORDER BY id', {
        replacements: { emails: ['admin@hannahhotel.com', 'admin@hannahhotelpainan.com'] }, transaction
      });
      const painan = admins.find(admin => admin.email === 'admin@hannahhotelpainan.com') || admins[0];
      if (!painan) return; // Fresh databases receive both accounts from the admin seeder.
      await queryInterface.bulkUpdate('Admins', { name: 'Admin Painan', email: 'admin@hannahhotelpainan.com', location: 'painan', updatedAt: new Date() }, { id: painan.id }, { transaction });
      const [padangAdmins] = await queryInterface.sequelize.query('SELECT id FROM "Admins" WHERE email = :email', { replacements: { email: 'admin@hannahhotelpadang.com' }, transaction });
      if (!padangAdmins.length) await queryInterface.bulkInsert('Admins', [{ name: 'Admin Padang', email: 'admin@hannahhotelpadang.com', password: painan.password, role: 'admin', location: 'padang', createdAt: new Date(), updatedAt: new Date() }], { transaction });
      await queryInterface.bulkUpdate('Rooms', { createdByAdminId: painan.id }, { location: 'painan' }, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Rooms', 'createdByAdminId');
    await queryInterface.removeColumn('Rooms', 'location');
    await queryInterface.removeColumn('Admins', 'location');
  }
};
