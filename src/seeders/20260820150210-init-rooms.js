'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Rooms', [
      {
        name: "Superior Room",
        price: "Rp396.000,-/RN",
        description: "Kamar nyaman dengan fasilitas lengkap untuk perjalanan bisnis maupun liburan Anda.",
        imageUrl: "/uploads/rooms/superior-room.jpg",
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Deluxe Room",
        price: "Rp466.000,-/RN",
        description: "Ruang lebih luas dengan interior elegan untuk pengalaman menginap yang istimewa.",
        imageUrl: "/uploads/rooms/deluxe-room.jpg",
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Executive Room",
        price: "Rp858.000,-/RN",
        description: "Pengalaman mewah dengan ruang tamu terpisah. Cocok untuk Anda yang menginginkan layanan eksklusif dan privasi tiada tara.",
        imageUrl: "/uploads/rooms/suite-room.jpg",
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Rooms', null, {});
  }
};
