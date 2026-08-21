'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Settings', [
      {
        key: 'footer_about',
        value: 'Hannah Hotel Syariah dengan Fasilitas terlengkap dikelasnya. Tengah kota. Akses ke tempat Wisata lebih dekat. Kenyamanan anda lebih kami utamakan.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'footer_address',
        value: 'Jl.Ilyas yakup no.24 Painan',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'footer_phone',
        value: '0811 661 7717',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'footer_email',
        value: 'info@hannahhotel.id',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Settings', null, {});
  }
};
