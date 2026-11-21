'use strict';

module.exports = {
  async up(queryInterface) {
    // 1. Deduplikasi Settings terlebih dahulu agar pembuatan unique index tidak gagal
    await queryInterface.sequelize.query(`
      DELETE FROM "Settings" a USING "Settings" b
      WHERE a.id < b.id AND a.key = b.key;
    `);

    // 2. Tambahkan unique index pada Settings.key
    await queryInterface.addIndex('Settings', ['key'], {
      unique: true,
      name: 'settings_key_unique',
    });

    // 3. Index untuk filter & order pada tabel publik
    await queryInterface.addIndex('Rooms', ['location', 'id'], {
      name: 'rooms_location_id_idx',
    });
    await queryInterface.addIndex('Rooms', ['location', 'isFeatured'], {
      name: 'rooms_location_featured_idx',
    });
    await queryInterface.addIndex('Facilities', ['location', 'id'], {
      name: 'facilities_location_id_idx',
    });
    await queryInterface.addIndex('Packages', ['location', 'id'], {
      name: 'packages_location_id_idx',
    });
    await queryInterface.addIndex('Galleries', ['createdAt'], {
      name: 'galleries_created_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Galleries', 'galleries_created_at_idx');
    await queryInterface.removeIndex('Packages', 'packages_location_id_idx');
    await queryInterface.removeIndex('Facilities', 'facilities_location_id_idx');
    await queryInterface.removeIndex('Rooms', 'rooms_location_featured_idx');
    await queryInterface.removeIndex('Rooms', 'rooms_location_id_idx');
    await queryInterface.removeIndex('Settings', 'settings_key_unique');
  },
};

